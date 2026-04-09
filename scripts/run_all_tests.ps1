# Master HRMS Test Suite Orchestrator
# Executes all test suites (Backend, Frontend, Mobile) and provides a unified report.

param (
    [switch]$SkipE2E,
    [switch]$SkipMobile,
    [int]$MaxSuiteRetries = 1
)

$ErrorActionPreference = "Continue"
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $RootDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

function Save-DockerComposeLogs {
    param(
        [string]$Suffix = "failure"
    )

    $normalSuffix = ($Suffix -replace '[^a-zA-Z0-9]', '_')
    $outFile = Join-Path $LogDir ("docker_compose_logs_{0}_{1}.log" -f $normalSuffix, (Get-Date -Format 'yyyyMMdd_HHmmss'))

    Write-Host "📦 Capturing docker compose logs to $outFile" -ForegroundColor Yellow
    try {
        & docker compose --env-file (Join-Path $RootDir 'deploy/environments/.env.local') logs --no-color --tail 200 > $outFile 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️ docker compose logs command returned exit code $LASTEXITCODE" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Failed to capture docker compose logs: $_" -ForegroundColor Red
    }
}

$transcriptPath = Join-Path $LogDir ("run_all_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
Start-Transcript -Path $transcriptPath -Force

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🏆 HARIKERJA MASTER TEST ORCHESTRATOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# --- 1. Infrastructure Preparation ---
Write-Host "🔧 Preparing Global environment..." -ForegroundColor Yellow
# Ensure Docker is up (reusing backend script logic), and reset to clean state for repeatable runs
Push-Location (Join-Path $RootDir "backend\scripts")
.\run_unit_tests.ps1 -DockerOnly -ResetDocker > $null 2>&1 # Reset, then start required services
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Initial Docker setup failed; retrying without reset..." -ForegroundColor Yellow
    .\run_unit_tests.ps1 -DockerOnly > $null 2>&1
}
Pop-Location

# --- 2. Start and prepare Backend Server (for E2E) ---
Write-Host "🚀 Preparing backend environment and starting local runserver (for E2E tests)..." -ForegroundColor Yellow
$BackendServerProcess = $null

function Start-BackendDevEnvironment {
    Write-Host "[Backend] Initializing dependencies and migrations via scripts\run_dev.ps1 --NoServer" -ForegroundColor Yellow
    Push-Location (Join-Path $RootDir "backend")
    # Use scripts\run_dev -NoServer to set up docker and migrations; does not start runserver.
    & pwsh -NoProfile -NoLogo -Command "./scripts/run_dev.ps1 -NoServer"
    $initExit = $LASTEXITCODE
    Pop-Location

    if ($initExit -ne 0) {
        Write-Host "⚠️ Backend initialization failed with exit code $initExit." -ForegroundColor Red
        return $false
    }
    return $true
}

function Test-BackendHealth {
    try {
        $health = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($health.StatusCode -ge 200 -and $health.StatusCode -lt 500) {
            return $true
        }
        if ($health.StatusCode -eq 404) {
            return $true
        }
        return $false
    } catch {
        $response = $_.Exception.Response
        if ($response -and $response.StatusCode -eq 404) {
            return $true
        }
        return $false
    }
}

function Is-BackendServerReady {
    $portOpen = $false
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $waitTask = $client.BeginConnect("127.0.0.1", 8000, $null, $null)
        if ($waitTask.AsyncWaitHandle.WaitOne(500, $false)) {
            $client.EndConnect($waitTask)
            $portOpen = $true
        }
        $client.Close()
    } catch { }

    if (-not $portOpen) { return $false }

    return Test-BackendHealth
}

function Ensure-BackendServerReady {
    param(
        [int]$MaxAttempts = 3,
        [int]$WaitSeconds = 240
    )

    $attempt = 0
    while ($attempt -lt $MaxAttempts) {
        if (Is-BackendServerReady) {
            Write-Host "✅ Backend server is healthy." -ForegroundColor Green
            return $true
        }

        Write-Host "⚠️ Backend server is not healthy; restarting backend (attempt $($attempt + 1)/$MaxAttempts)..." -ForegroundColor Yellow
        Stop-BackendRunserver
        Start-BackendRunserver

        $waitOk = Wait-ForBackendReady -MaxWaitSeconds $WaitSeconds
        if ($waitOk -and (Is-BackendServerReady)) {
            return $true
        }

        $attempt++
    }

    return $false
}

function Start-BackendRunserver {
    $backendDir = Join-Path $RootDir "backend"

    if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) {
        if (Test-BackendHealth) {
            Write-Host "⚠️ Port 8000 is already listening and /api/ is healthy; reuse existing backend." -ForegroundColor Yellow
            return $null
        }

        Write-Host "⚠️ Port 8000 is listening but backend health check failed; terminating old process(es) and restarting." -ForegroundColor Yellow
        Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.OwningProcess) {
                Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Seconds 2
    }

    Write-Host "[Backend] Starting scripts\run_dev.ps1 (with Coverage collection) in background process..." -ForegroundColor Green
    $BackendServerProcess = Start-Process -FilePath "pwsh" -ArgumentList @("-NoProfile", "-NoLogo", "-Command", "cd '$backendDir'; ./scripts/run_dev.ps1 -Coverage") -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru

    return $BackendServerProcess
}

function Stop-BackendRunserver {
    if ($BackendServerProcess -and -not $BackendServerProcess.HasExited) {
        Write-Host "[Backend] Stopping backend runserver process (PID $($BackendServerProcess.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $BackendServerProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

function Wait-ForBackendReady {
    param(
        [int]$MaxWaitSeconds = 300,
        [int]$IntervalSeconds = 3
    )

    $waited = 0
    while ($waited -lt $MaxWaitSeconds) {
        $portOpen = $false
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $waitTask = $client.BeginConnect("127.0.0.1", 8000, $null, $null)
            if ($waitTask.AsyncWaitHandle.WaitOne(500, $false)) {
                $client.EndConnect($waitTask)
                $portOpen = $true
            }
            $client.Close()
        } catch { }

        if ($portOpen -and (Test-BackendHealth)) {
            Write-Host "`n✅ Backend Server is READY (health check passed)." -ForegroundColor Green
            return $true
        }

        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds $IntervalSeconds
        $waited += $IntervalSeconds
    }

    return $false
}

$initOk = Start-BackendDevEnvironment
if (-not $initOk) {
    Write-Host "\n⚠️ Backend initialization failed. E2E may not run." -ForegroundColor Red
    $allPassed = $false
} else {
    Start-BackendRunserver
    $serverReady = Wait-ForBackendReady -MaxWaitSeconds 300

    if (-not $serverReady) {
        Write-Host "\n⚠️ Backend server did not become ready in 300s. Attempting Ensure-BackendServerReady..." -ForegroundColor Yellow
        $serverReady = Ensure-BackendServerReady -MaxAttempts 2 -WaitSeconds 240
    }

    if (-not $serverReady) {
        Write-Host "\n⚠️ WARNING: Backend server failed to start in time after retries." -ForegroundColor Yellow
        Write-Host "Backend E2E may still run but could fail; we continue to run all suites." -ForegroundColor Yellow
        $allPassed = $false
    }

    if (-not $serverReady) {
        Write-Host "\n⚠️ WARNING: Backend server failed to start in time after retries." -ForegroundColor Yellow
        Write-Host "Backend E2E may still run but could fail; we continue to run all suites." -ForegroundColor Yellow
        $allPassed = $false
    }
}

# --- 3. Execute Suites ---
function Extract-TestMetrics {
    param([string]$LogPath, [string]$SuiteName)
    $p = 0; $f = 0; $e = 0; $w = 0

    if (-not (Test-Path $LogPath)) { return @{ P=$p; F=$f; E=$e; W=$w } }
    
    $content = Get-Content $LogPath -ErrorAction SilentlyContinue
    if ($SuiteName -match "Backend") {
        foreach ($line in $content) {
            # Strip ANSI color codes for robust matching
            $cleanLine = $line -replace '\x1b\[[0-9;]*m', ''
            if ($cleanLine -match "==.* (passed|failed|error|skipped|warning|xfailed|xpassed).* in .*") {
                if ($cleanLine -match "(\d+)\s+passed") { $p += [int]$Matches[1] }
                if ($cleanLine -match "(\d+)\s+failed") { $f += [int]$Matches[1] }
                if ($cleanLine -match "(\d+)\s+error") { $e += [int]$Matches[1] }
                if ($cleanLine -match "(\d+)\s+warning") { $w += [int]$Matches[1] }
            }
        }
    } elseif ($SuiteName -match "Frontend") {
        foreach ($line in $content) {
            $cleanLine = $line -replace '\x1b\[[0-9;]*m', ''
            # Vitest summary
            if ($cleanLine -match "Tests.*?(\d+)\s+passed") { $p += [int]$Matches[1] }
            if ($cleanLine -match "Tests.*?(\d+)\s+failed") { $f += [int]$Matches[1] }
            # Playwright summary (starts with whitespace then number)
            if ($cleanLine -match "^\s*(\d+)\s+passed") { $p += [int]$Matches[1] }
            if ($cleanLine -match "^\s*(\d+)\s+failed") { $f += [int]$Matches[1] }
            if ($cleanLine -match "^\s*(\d+)\s+flaky") { $w += [int]$Matches[1] }
        }
    } elseif ($SuiteName -match "Mobile") {
        foreach ($line in $content) {
            $cleanLine = $line -replace '\x1b\[[0-9;]*m', ''
            if ($cleanLine -match "TOTAL PASSED:\s+(\d+)") { $p += [int]$Matches[1] }
            if ($cleanLine -match "TOTAL FAILED:\s+(\d+)") { $f += [int]$Matches[1] }
            if ($cleanLine -match "TOTAL ERRORS:\s+(\d+)") { $e += [int]$Matches[1] }
            if ($cleanLine -match "WARNINGS?:\s+(\d+)") { $w += [int]$Matches[1] }
        }
    }
    return @{ P=$p; F=$f; E=$e; W=$w }
}

$suites = @(
    @{ Name = "Backend Stack"; Path = "backend\scripts\run_tests.ps1" },
    @{ Name = "Frontend Stack"; Path = "frontend\scripts\run_tests.ps1" },
    @{ Name = "Mobile Stack"; Path = "mobile\scripts\run_tests.ps1" }
)

$results = @()
$allPassed = $true

try {
    foreach ($s in $suites) {
        if ($s.Name -like "*Backend*" -and -not $SkipE2E) {
            if (-not (Is-BackendServerReady)) {
                Write-Host "`n⚠️ Backend server not healthy before tests. Retrying startup." -ForegroundColor DarkYellow
                $serverReady = Ensure-BackendServerReady -MaxAttempts 2 -WaitSeconds 240
            }
        }

        if ($s.Name -like "*Mobile*" -and $SkipMobile) {
            Write-Host "`n⏭ SKIPPED: $($s.Name)" -ForegroundColor DarkYellow
            $results += [PSCustomObject]@{ Suite = $s.Name; Status = "⏭ SKIPPED"; Passed = "-"; Failed = "-"; Error = "-"; Warn = "-"; Exit = 0; Log = "-" }
            continue
        }

        Write-Host "`n🚀 RUNNING: $($s.Name)" -ForegroundColor Yellow
        Write-Host "----------------------------------------" -ForegroundColor Gray

        $fullPath = Join-Path $RootDir $s.Path
        $dir = Split-Path $fullPath
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $suiteLog = Join-Path $LogDir ("{0}_{1}.log" -f ($s.Name -replace '[^a-zA-Z0-9\-_.]','_'), $timestamp)

        $exitCode = 1
        $attempt = 0

        while ($attempt -le $MaxSuiteRetries) {
            if ($attempt -gt 0) {
                Write-Host "Retry attempt $attempt for suite $($s.Name) ..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
            }

            Push-Location $dir
            Write-Host "Logging to: $suiteLog" -ForegroundColor Gray

            try {
                $cmdArgs = @()
                if ($SkipE2E) { $cmdArgs += "-SkipE2E" }
                
                $cmd = "& '$fullPath'"
                if ($cmdArgs.Count -gt 0) {
                    $cmd = "$cmd $([string]::Join(' ', $cmdArgs))"
                }

                & pwsh -NoProfile -NoLogo -Command $cmd 2>&1 | Tee-Object -FilePath $suiteLog
                $exitCode = $LASTEXITCODE
            } catch {
                $exitCode = 1
                Write-Host "Exception in suite $($s.Name): $_" -ForegroundColor Red
            }

            Pop-Location

            if ($exitCode -eq 0) {
                break
            }

            $attempt++
            if ($attempt -gt $MaxSuiteRetries) {
                break
            }
        }

        $status = if ($exitCode -eq 0) { "✅ PASSED" } else { "❌ FAILED"; $allPassed = $false }
        if ($attempt -gt 0 -and $exitCode -eq 0) {
            $status += " (retried $attempt times)"
        }

        if ($exitCode -ne 0) {
            Save-DockerComposeLogs -Suffix ($s.Name -replace '[^a-zA-Z0-9]', '_')
        }

        # --- Move failure screenshots to the stack's logs folder ---
        $stackLogDir = Join-Path $dir "logs"
        if (-not (Test-Path $stackLogDir)) {
            New-Item -ItemType Directory -Path $stackLogDir -ErrorAction SilentlyContinue | Out-Null
        }
        $pngFiles = Get-ChildItem -Path $dir -Filter "*-failure.png" -File -ErrorAction SilentlyContinue
        if ($pngFiles) {
            $pngFiles | Move-Item -Destination $stackLogDir -Force
            Write-Host "   📸 Moved $($pngFiles.Count) failure screenshots to $stackLogDir" -ForegroundColor DarkYellow
        }

        $metrics = Extract-TestMetrics -LogPath $suiteLog -SuiteName $s.Name

        $results += [PSCustomObject]@{
            Suite  = $s.Name
            Status = $status
            Passed = $metrics.P
            Failed = $metrics.F
            Error  = $metrics.E
            Warn   = $metrics.W
            Exit   = $exitCode
            Log    = $suiteLog
        }
    }
} finally {
    # --- 4. Cleanup ---
    Write-Host "`n🧼 Cleaning up backend server..." -ForegroundColor Yellow
    Stop-BackendRunserver

    # Additional safety: ensure no process remains bound on 8000 if the runserver spawned outside of this script.
    $serverProc = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($serverProc) {
        try {
            Stop-Process -Id $serverProc.OwningProcess -Force -ErrorAction SilentlyContinue
        } catch {
            # no-op if unable to stop
        }
    }

    # --- 4.5. Generate Backend E2E Coverage Report ---
    if (Test-Path (Join-Path $RootDir "backend\scripts\report_e2e_coverage.ps1")) {
        Write-Host "`n📊 Post-Processing Coverage Data..." -ForegroundColor Cyan
        & pwsh -NoProfile -NoLogo -Command "cd '$(Join-Path $RootDir 'backend\scripts')'; ./report_e2e_coverage.ps1"
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 FINAL MASTER REPORT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$results | Format-Table -AutoSize

if ($allPassed) {
    Write-Host "🏆 ALL SUITES PASSED (100%)" -ForegroundColor Green
    exit 0
} else {
    Save-DockerComposeLogs -Suffix "master_failure"

    Write-Host "💀 SOME SUITES FAILED. Please check logs for details." -ForegroundColor Red
    exit 1
}
