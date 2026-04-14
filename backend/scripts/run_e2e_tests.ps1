# HRMS Backend End-to-End (E2E) Test Runner
# This script runs tests against a LIVE/Running server.
# Default: http://localhost:8000

param(
    [int]$Workers = 0,
    [switch]$NoSeed,
    [switch]$NoStart,
    [switch]$NoDeps,
    [switch]$ForceDeps
)

$ErrorActionPreference = "Stop"

# 1. Setup Paths
$BackendDir = Split-Path -Parent $PSScriptRoot
$RootDir = Split-Path -Parent $BackendDir
$VenvDir = Join-Path $BackendDir "venv"
$PythonExec = if ($IsWindows) { Join-Path $VenvDir "Scripts\python.exe" } else { Join-Path $VenvDir "bin/python" }

Write-Host "--- HRMS Backend E2E Test Suite ---" -ForegroundColor Cyan

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

function Wait-ForPort {
    param([int]$Port, [int]$TimeoutSeconds = 120)
    $waited = 0
    while ($waited -lt $TimeoutSeconds) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $waitTask = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
            if ($waitTask.AsyncWaitHandle.WaitOne(500, $false)) {
                $client.EndConnect($waitTask)
                $client.Close()
                return $true
            }
            $client.Close()
        } catch { }
        Start-Sleep -Seconds 2
        $waited += 2
    }
    return $false
}

function Ensure-BackendStarted {
    if (Test-BackendHealth) { return $true }
    if ($NoStart) {
        Write-Host "NoStart flag set and backend is not ready." -ForegroundColor Yellow
        return $false
    }

    $upScript = Join-Path $RootDir "up.ps1"
    if (-not (Test-Path $upScript)) {
        Write-Host "up.ps1 not found at $upScript. Cannot auto-start backend." -ForegroundColor Yellow
        return $false
    }

    Write-Host "⚠️ Starting backend via up.ps1 dev..." -ForegroundColor Yellow
    Push-Location $RootDir
    .\up.ps1 dev
    Pop-Location

    Write-Host "Waiting for backend port 8000 (max 180s)..." -ForegroundColor Gray
    if (-not (Wait-ForPort -Port 8000 -TimeoutSeconds 180)) {
        Write-Host "❌ ERROR: Timeout waiting for backend port 8000" -ForegroundColor Red
        return $false
    }

    Write-Host "Performing backend API health check..." -ForegroundColor Gray
    $waited = 0
    while ($waited -lt 120) {
        if (Test-BackendHealth) { return $true }
        Start-Sleep -Seconds 5
        $waited += 5
    }
    return $false
}

# 1. Sync Dependencies
if (-not $NoDeps) {
    Write-Host "Checking dependencies..." -ForegroundColor Yellow
    if (-not (Test-Path $VenvDir)) {
        Write-Host "Creating virtual environment..." -ForegroundColor Gray
        python -m venv $VenvDir
    }
    
    $reqFile = Join-Path $BackendDir "requirements.txt"
    $reqHashPath = Join-Path $BackendDir ".venv_requirements.hash"
    $currentHash = (Get-FileHash -Path $reqFile -Algorithm SHA256).Hash
    $cachedHash = if (Test-Path $reqHashPath) { Get-Content $reqHashPath -Raw } else { "" }

    if ($ForceDeps -or $currentHash -ne $cachedHash) {
        Write-Host "Installing requirements..." -ForegroundColor Gray
        & $PythonExec -m pip install --upgrade pip setuptools wheel
        & $PythonExec -m pip install -r $reqFile
        $currentHash | Out-File -FilePath $reqHashPath -Encoding ascii
    }
}

# 2. Check server
Write-Host "Checking if backend server is running on localhost:8000..." -ForegroundColor Yellow
if (-not (Ensure-BackendStarted)) {
    Write-Host "❌ ERROR: Backend server is not ready." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend server is unreachable and healthy." -ForegroundColor Green

# 3. Seeding
if (-not $NoSeed) {
    Write-Host "Seeding test database..." -ForegroundColor Yellow
    $seedScript = Join-Path $BackendDir "scripts\seed_test_db.py"
    & $PythonExec $seedScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Database seeding failed." -ForegroundColor Red
        exit 1
    }
}

# 4. Run Pytest
Write-Host "Running E2E tests targetting localhost:8000..." -ForegroundColor Green
$LogDir = Join-Path $BackendDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("e2e_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

$workerCount = if ($Workers -gt 0) { $Workers } else { 1 }
$pytestArgs = @("-m", "e2e", "tests_e2e/", "--color=yes", "--maxfail=1", "--durations=20", "--reuse-db", "-n", $workerCount)

$env:COLUMNS = 120
& $PythonExec -m pytest @pytestArgs 2>&1 | Tee-Object -FilePath $LogFile
$exitCode = $LASTEXITCODE

# 5. Summary
$finalLines = Get-Content $LogFile -Tail 10
$summaryLine = $finalLines | Where-Object { $_ -match "==.* (passed|failed|error|skipped|warning|xfailed|xpassed) in .*" }

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "                E2E TEST RUN SUMMARY" -ForegroundColor Cyan -NoNewline
Write-Host " (Exit: $exitCode)" -ForegroundColor Gray
Write-Host ("=" * 60) -ForegroundColor Gray

if ($summaryLine) {
    $cleanSummary = $summaryLine.Trim(' =')
    Write-Host " DETAILS : $cleanSummary" -ForegroundColor White
    if ($cleanSummary -match "failed|error") {
        Write-Host " STATUS  : ❌ E2E TESTS FAILED" -ForegroundColor Red
    } elseif ($cleanSummary -match "warning") {
        Write-Host " STATUS  : ⚠️ E2E PASSED WITH WARNINGS" -ForegroundColor Yellow
    } elseif ($exitCode -eq 0) {
        Write-Host " STATUS  : ✅ E2E TESTS PASSED" -ForegroundColor Green
    }
} elseif ($exitCode -eq 0) {
    Write-Host " STATUS  : ✅ E2E TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host " STATUS  : ❌ E2E EXECUTION FAILED" -ForegroundColor Red
}
Write-Host ("=" * 60) -ForegroundColor Gray

exit $exitCode
