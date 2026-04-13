# Master HRMS Test Suite Orchestrator
# Executes all test suites (Backend, Frontend, Mobile) and provides a unified report.

param (
    [switch]$SkipE2E,
    [switch]$SkipMobile,
    [int]$MaxSuiteRetries = 1
)

$ErrorActionPreference = "Continue" # Ensure we try all suites even if one fails
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $RootDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$allPassed = $true

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

$Timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$TranscriptPath = Join-Path $LogDir ("run_all_test_$Timestamp.log")
Start-Transcript -Path $TranscriptPath -Force

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🏆 HARIKERJA MASTER POWER-ORCHESTRATOR" -ForegroundColor Cyan
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
$BackendServerProcess = $null

function Test-BackendHealth {
    try {
        $health = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($health.StatusCode -ge 200 -and $health.StatusCode -lt 500) {
            return $true
        }
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 404) {
            return $true
        }
    }
    return $false
}

function Start-BackendRunserver {
    $backendDir = Join-Path $RootDir "backend"

    # Check if port 8000 is already in use
    $portEntry = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($portEntry) {
        if (Test-BackendHealth) {
            Write-Host "⚠️ Port 8000 is already listening and /api/ is healthy; reuse existing backend." -ForegroundColor Yellow
            return $null
        }

        Write-Host "⚠️ Port 8000 is listening but backend health check failed; terminating old process and restarting." -ForegroundColor Yellow
        Stop-Process -Id $portEntry.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    Write-Host "[Backend] Starting scripts\run_dev.ps1 (with Coverage collection) in background process..." -ForegroundColor Green
    $script = Join-Path $backendDir "scripts\run_dev.ps1"
    $BackendServerProcess = Start-Process -FilePath "pwsh" -ArgumentList "-NoProfile", "-NoLogo", "-Command", "cd '$backendDir'; & '$script' -Coverage" -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru
    return $BackendServerProcess
}

function Stop-BackendRunserver {
    if ($BackendServerProcess -and -not $BackendServerProcess.HasExited) {
        Write-Host "[Backend] Stopping backend runserver process (PID $($BackendServerProcess.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $BackendServerProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Extra safety: check port 8000 again
    $portEntry = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($portEntry) {
        Stop-Process -Id $portEntry.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

function Wait-ForBackendReady {
    param(
        [int]$MaxWaitSeconds = 300,
        [int]$IntervalSeconds = 5
    )

    $waited = 0
    while ($waited -lt $MaxWaitSeconds) {
        if (Test-BackendHealth) {
            Write-Host "`n✅ Backend Server is READY (health check passed)." -ForegroundColor Green
            return $true
        }

        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds $IntervalSeconds
        $waited += $IntervalSeconds
    }

    return $false
}

function Ensure-BackendServerReady {
    param(
        [int]$MaxAttempts = 2,
        [int]$WaitSeconds = 240
    )

    $attempt = 0
    while ($attempt -lt $MaxAttempts) {
        if (Test-BackendHealth) {
            Write-Host "✅ Backend server is healthy." -ForegroundColor Green
            return $true
        }

        Write-Host "⚠️ Backend server is not healthy; restarting backend (attempt $($attempt + 1)/$MaxAttempts)..." -ForegroundColor Yellow
        Stop-BackendRunserver
        Start-BackendRunserver | Out-Null

        if (Wait-ForBackendReady -MaxWaitSeconds $WaitSeconds) {
            return $true
        }

        $attempt++
    }

    return $false
}

if (-not $SkipE2E) {
    Write-Host "🚀 Preparing backend infrastructure (migrations/deps)..." -ForegroundColor Yellow
    Push-Location (Join-Path $RootDir "backend")
    & pwsh -NoProfile -NoLogo -Command "./scripts/run_dev.ps1 -NoServer"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️ Backend initialization failed. E2E might fail." -ForegroundColor Red
        $allPassed = $false
    }
    Pop-Location

    Start-BackendRunserver | Out-Null
    $serverReady = Wait-ForBackendReady -MaxWaitSeconds 300 # Initial long wait

    if (-not $serverReady) {
        Write-Host "`n⚠️ Backend server did not become ready in 300s. Attempting recovery..." -ForegroundColor Yellow
        $serverReady = Ensure-BackendServerReady -MaxAttempts 2 -WaitSeconds 240
    }

    if (-not $serverReady) {
        Write-Host "`n❌ ERROR: Backend server failed to start in time after retries." -ForegroundColor Red
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
    foreach ($line in $content) {
        $cleanLine = $line -replace '\x1b\[[0-9;]*m', '' # Strip ANSI colors

        if ($SuiteName -match "Backend") {
            if ($cleanLine -match "==.* (passed|failed|error|skipped|warning|xfailed|xpassed).* in .*") {
                if ($cleanLine -match "(\d+)\s+passed") { $p += [int]$Matches[1] }
                if ($cleanLine -match "(\d+)\s+failed") { $f += [int]$Matches[1] }
                if ($cleanLine -match "(\d+)\s+error") { $e += [int]$Matches[1] }
                if ($cleanLine -match "(\d+)\s+warning") { $w += [int]$Matches[1] }
            }
        } elseif ($SuiteName -match "Frontend") {
            # Vitest summary
            if ($cleanLine -match "Tests.*?(\d+)\s+passed") { $p += [int]$Matches[1] }
            if ($cleanLine -match "Tests.*?(\d+)\s+failed") { $f += [int]$Matches[1] }
            # Playwright summary
            if ($cleanLine -match "^\s*(\d+)\s+passed") { $p += [int]$Matches[1] }
            if ($cleanLine -match "^\s*(\d+)\s+failed") { $f += [int]$Matches[1] }
            if ($cleanLine -match "^\s*(\d+)\s+flaky") { $w += [int]$Matches[1] }
        } elseif ($SuiteName -match "Mobile") {
            if ($cleanLine -match "TOTAL PASSED:\s+(\d+)") { $p += [int]$Matches[1] }
            if ($cleanLine -match "TOTAL FAILED:\s+(\d+)") { $f += [int]$Matches[1] }
            if ($cleanLine -match "TOTAL ERRORS:\s+(\d+)") { $e += [int]$Matches[1] }
            if ($cleanLine -match "WARNINGS?:\s+(\d+)") { $w += [int]$Matches[1] }
        }
    }
    return @{ P=$p; F=$f; E=$e; W=$w }
}

$suites = @(
    @{ Name = "Backend Stack"; Path = "backend/scripts/run_tests.ps1" },
    @{ Name = "Frontend Stack"; Path = "frontend/scripts/run_tests.ps1" },
    @{ Name = "Mobile Stack"; Path = "mobile/scripts/run_tests.ps1" }
)

$results = @()

try {
    foreach ($s in $suites) {
        if ($s.Name -like "*Mobile*" -and $SkipMobile) {
            Write-Host "`n⏭ SKIPPED: $($s.Name)" -ForegroundColor DarkYellow
            $results += [PSCustomObject]@{ Suite = $s.Name; Status = "⏭ SKIPPED"; Passed = "-"; Failed = "-"; Error = "-"; Warn = "-"; Log = "-" }
            continue
        }

        # Pre-check backend server if it's supposed to be running
        if (-not $SkipE2E -and ($s.Name -match "Backend" -or $s.Name -match "Frontend")) {
            if (-not (Test-BackendHealth)) {
                Write-Host "`n⚠️ Backend server unexpectedly unhealthy. Attempting recovery for $($s.Name)..." -ForegroundColor Yellow
                Ensure-BackendServerReady -MaxAttempts 2 -WaitSeconds 240 | Out-Null
            }
        }

        Write-Host "`n🚀 RUNNING: $($s.Name)" -ForegroundColor Yellow
        Write-Host "----------------------------------------" -ForegroundColor Gray

        $fullPath = Join-Path $RootDir ($s.Path -replace '/', '\')
        $dir = Split-Path $fullPath
        $suiteTimestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $suiteLog = Join-Path $LogDir ("{0}_{1}.log" -f ($s.Name -replace '[^a-zA-Z0-9]','_'), $suiteTimestamp)

        $exitCode = 1
        $attempt = 0

        while ($attempt -le $MaxSuiteRetries) {
            if ($attempt -gt 0) {
                Write-Host "Retry attempt $attempt for suite $($s.Name) ..." -ForegroundColor Yellow
                Start-Sleep -Seconds 5
            }

            Push-Location $dir
            $cmdArgs = if ($SkipE2E) { "-SkipE2E" } else { "" }
            & pwsh -NoProfile -NoLogo -Command "& '$fullPath' $cmdArgs" 2>&1 | Tee-Object -FilePath $suiteLog
            $exitCode = $LASTEXITCODE
            Pop-Location

            if ($exitCode -eq 0) { break }
            $attempt++
        }

        if ($exitCode -ne 0) {
            $allPassed = $false
            Save-DockerComposeLogs -Suffix ($s.Name -replace '[^a-zA-Z0-9]', '_')
        }

        # Move screenshots
        $pngFiles = Get-ChildItem -Path $dir -Filter "*-failure.png" -File -ErrorAction SilentlyContinue
        if ($pngFiles) {
            $stackLogDir = Join-Path $dir "logs"
            if (-not (Test-Path $stackLogDir)) { New-Item -ItemType Directory -Path $stackLogDir | Out-Null }
            $pngFiles | Move-Item -Destination $stackLogDir -Force
            Write-Host "   📸 Moved $($pngFiles.Count) failure screenshots to $stackLogDir" -ForegroundColor DarkYellow
        }

        $metrics = Extract-TestMetrics -LogPath $suiteLog -SuiteName $s.Name
        $status = if ($exitCode -eq 0) { "✅ PASSED" } else { "❌ FAILED" }
        if ($attempt -gt 0 -and $exitCode -eq 0) { $status += " (retried $attempt)" }

        $results += [PSCustomObject]@{
            Suite  = $s.Name
            Status = $status
            Passed = $metrics.P
            Failed = $metrics.F
            Error  = $metrics.E
            Warn   = $metrics.W
            Log    = $suiteLog
        }
    }
} finally {
    Write-Host "`n🧼 Cleaning up..." -ForegroundColor Yellow
    Stop-BackendRunserver

    # Coverage Report
    $covScript = Join-Path $RootDir "backend/scripts/report_e2e_coverage.ps1"
    if (Test-Path $covScript) {
        Write-Host "`n📊 Post-Processing Coverage Data..." -ForegroundColor Cyan
        & pwsh -NoProfile -NoLogo -Command "& '$covScript'"
    }

    Stop-Transcript
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
