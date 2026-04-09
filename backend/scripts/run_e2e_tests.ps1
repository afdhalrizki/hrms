# HRMS Backend End-to-End (E2E) Test Runner
# This script runs tests against a LIVE/Running server.
# Default: http://localhost:8000

param(
    [int]$Workers = 0,
    [switch]$NoSeed,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"

# 1. Setup Paths
$BackendDir = Split-Path -Parent $PSScriptRoot
Push-Location $BackendDir
$RootDir = Split-Path -Parent $BackendDir
$EnvFile = Join-Path $RootDir "deploy\environments\.env.local"
$VenvDir = Join-Path $BackendDir "venv"
$PytestExec = Join-Path $VenvDir "Scripts\pytest.exe"
$PythonExec = Join-Path $VenvDir "Scripts\python.exe"

Push-Location $BackendDir

Write-Host "--- HRMS Backend E2E Test Suite ---" -ForegroundColor Cyan

function Wait-BackendHealth {
    param(
        [int]$MaxWaitSeconds = 180,
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

        if ($portOpen) {
            try {
                $health = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
                if ($health.StatusCode -ge 200 -and $health.StatusCode -lt 500) {
                    return $true
                }
            } catch [System.Net.WebException] {
                if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 404) {
                    return $true
                }
            } catch {
                # continue
            }

            # If Invoke-WebRequest raises HttpResponseException for 404, allow it as healthy too
            try {
                $health = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
                if ($health.StatusCode -eq 404) { return $true }
            } catch [Microsoft.PowerShell.Commands.HttpResponseException] {
                if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 404) {
                    return $true
                }
            } catch {
                # continue and retry
            }
        }
        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds $IntervalSeconds
        $waited += $IntervalSeconds
    }
    return $false
}

function Wait-ForPort {
    param(
        [string]$HostName = '127.0.0.1',
        [int]$Port,
        [int]$TimeoutSeconds = 120,
        [int]$IntervalSeconds = 2
    )

    $waited = 0
    while ($waited -lt $TimeoutSeconds) {
        $portOpen = $false
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $waitTask = $client.BeginConnect($HostName, $Port, $null, $null)
            if ($waitTask.AsyncWaitHandle.WaitOne(500, $false)) {
                $client.EndConnect($waitTask)
                $portOpen = $true
            }
            $client.Close()
        } catch { }

        if ($portOpen) {
            return $true
        }
        Start-Sleep -Seconds $IntervalSeconds
        $waited += $IntervalSeconds
    }
    return $false
}

function Ensure-BackendStarted {
    param(
        [int]$StartTimeoutSeconds = 180
    )

    $root = Split-Path -Parent (Split-Path -Parent -Path $PSScriptRoot)
    $upScript = Join-Path $root "up.ps1"

    if (Wait-BackendHealth -MaxWaitSeconds 5) {
        return $true
    }

    if ($NoStart) {
        Write-Host "NoStart flag set and backend is not ready." -ForegroundColor Yellow
        return $false
    }

    if (-not (Test-Path $upScript)) {
        Write-Host "up.ps1 not found at $upScript. Cannot auto-start backend." -ForegroundColor Yellow
        return $false
    }

    Write-Host "⚠️ Starting backend via up.ps1 dev..." -ForegroundColor Yellow
    Push-Location $root
    .\up.ps1 dev
    Pop-Location

    Write-Host "Waiting for backend port 8000 (max $StartTimeoutSeconds s)..." -ForegroundColor Gray
    if (-not (Wait-ForPort -HostName '127.0.0.1' -Port 8000 -TimeoutSeconds $StartTimeoutSeconds -IntervalSeconds 2)) {
        Write-Host "ERROR: Timeout waiting for backend port 8000" -ForegroundColor Red
        return $false
    }

    Write-Host "Performing backend API health check..." -ForegroundColor Gray
    if (-not (Wait-BackendHealth)) {
        Write-Host "ERROR: Backend health endpoint is still failing." -ForegroundColor Red
        return $false
    }

    Start-Sleep -Seconds 5
    return $true
}

# 1. Check if server is running and healthy
Write-Host "Checking if backend server is running on localhost:8000..." -ForegroundColor Yellow
$serverReady = Ensure-BackendStarted -StartTimeoutSeconds 180

if (-not $serverReady) {
    Write-Host "ERROR: Backend server is not ready on localhost:8000 after retries." -ForegroundColor Red
    Write-Host "Please run 'pwsh ./run_dev.ps1' in a separate terminal first, then rerun." -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Backend server is reachable and healthy." -ForegroundColor Green

# 2. Virtual Environment Check
if (-not (Test-Path $PytestExec)) {
    Write-Host "pytest not found in $VenvDir. Please ensure venv is setup." -ForegroundColor Red
    exit 1
}

# 2. Seed Test Data
if (-not $NoSeed) {
    Write-Host "Seeding test database..." -ForegroundColor Cyan
    & $PythonExec "$PSScriptRoot\seed_test_db.py"
} else {
    Write-Host "Skipping seed step due to --NoSeed." -ForegroundColor Yellow
}

# 3. Run Pytest with E2E marker
Write-Host "Running E2E tests targetting localhost:8000..." -ForegroundColor Green

# Ensuring log directory exists
$LogDir = Join-Path $BackendDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("e2e_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

try {
    # Dynamically detect terminal width for better alignment when piped
    $termWidth = if ($Host.UI.RawUI.WindowSize.Width -gt 0) { $Host.UI.RawUI.WindowSize.Width } else { 120 }

    # Force color output and pass detected terminal width
    $workerCount = if ($Workers -gt 0) { $Workers } else { 1 }

    $pytestArgs = @(
        "-m", "e2e",
        "tests_e2e/",
        "--color=yes",
        "--maxfail=1",
        "--durations=20",
        "--reuse-db",
        "-n", $workerCount
    )

    $env:COLUMNS = $termWidth
    & $PythonExec -m pytest @pytestArgs 2>&1 | Tee-Object -FilePath $LogFile
    $exitCode = $LASTEXITCODE

    # 4. Final Summary Parsing
    $finalLines = Get-Content $LogFile -Tail 10
    $summaryLine = $finalLines | Where-Object { $_ -match "==.* (passed|failed|error|skipped|warning|xfailed|xpassed) in .*" }
    
    Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
    Write-Host "                E2E TEST RUN SUMMARY" -ForegroundColor Cyan -NoNewline
    Write-Host " (Exit: $exitCode)" -ForegroundColor Gray
    Write-Host ("=" * 60) -ForegroundColor Gray
    
    if ($summaryLine) {
        # Clean up the summary line for display
        $cleanSummary = $summaryLine.Trim(' =')
        Write-Host " DETAILS : $cleanSummary" -ForegroundColor White
        
        # Determine Status and Color
        if ($cleanSummary -match "failed|error") {
            Write-Host " STATUS  : ❌ E2E TESTS FAILED" -ForegroundColor Red
        } elseif ($cleanSummary -match "warning") {
            Write-Host " STATUS  : ⚠️ E2E PASSED WITH WARNINGS" -ForegroundColor Yellow
        } elseif ($exitCode -eq 0) {
            Write-Host " STATUS  : ✅ E2E TESTS PASSED" -ForegroundColor Green
        } else {
            Write-Host " STATUS  : ❌ UNKNOWN FAILURE (Exit Code: $exitCode)" -ForegroundColor Red
        }
    } else {
        if ($exitCode -eq 0) {
            Write-Host " STATUS  : ✅ E2E TESTS PASSED" -ForegroundColor Green
        } else {
            Write-Host " STATUS  : ❌ E2E EXECUTION FAILED" -ForegroundColor Red
        }
    }
    Write-Host ("=" * 60) -ForegroundColor Gray
} finally {
    # File is persistent in logs/ now
}

Pop-Location
exit $exitCode
