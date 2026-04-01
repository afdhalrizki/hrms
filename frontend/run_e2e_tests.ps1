# Playwright E2E Master Script
# Usage: .\run_e2e_tests.ps1 [-Live] [-SkipInstall] [-SkipSeed]

param (
    [switch]$Live,         # Run against real backend (requires Docker)
    [switch]$SkipInstall,  # Skip npm install check
    [switch]$SkipSeed      # Skip database seeding
)

$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent -Path $ScriptDir
$BackendDir = Join-Path $RootDir "backend"

Push-Location $ScriptDir

Write-Host "--- HRMS Playwright Automation ---" -ForegroundColor Cyan

# Ensuring log directory exists
$LogDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("e2e_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

# 1. Dependency Check
if (-not $SkipInstall) {
    Write-Host "[1/3] Checking Frontend Dependencies..." -ForegroundColor Yellow
    npm install
    npx playwright install chromium
}

Write-Host "Logging output to: $LogFile" -ForegroundColor Gray

function Wait-ForPort {
    param(
        [string]$HostName = '127.0.0.1',
        [int]$Port,
        [int]$TimeoutSeconds = 120,
        [int]$IntervalSeconds = 2
    )

    $waited = 0
    while ($waited -lt $TimeoutSeconds) {
        if (Test-NetConnection -ComputerName $HostName -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue) {
            return $true
        }
        Start-Sleep -Seconds $IntervalSeconds
        $waited += $IntervalSeconds
    }
    return $false
}

function Test-BackendHealth {
    try {
        $health = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return $true
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 404) {
            return $true
        }
        return $false
    }
}

# 2. Environment Setup
if ($Live) {
    Write-Host "[2/3] Setting up Live Backend Environment..." -ForegroundColor Yellow
    
    $UpScript = Join-Path $RootDir "up.ps1"
    if (Test-Path $UpScript) {
        Write-Host "Ensuring backend is up..."
        Push-Location $RootDir
        .\up.ps1 dev
        Pop-Location

        Write-Host "Waiting for backend port 8000 (max 120s)..." -ForegroundColor Gray
        if (-not (Wait-ForPort -Port 8000 -TimeoutSeconds 180)) {
            Write-Host "ERROR: Backend port 8000 did not become available." -ForegroundColor Red
            Pop-Location
            exit 1
        }

        if (-not (Test-BackendHealth)) {
            Write-Host "ERROR: Backend health check failed after startup." -ForegroundColor Red
            Pop-Location
            exit 1
        }

        # Wait for DB to settle
        Start-Sleep -Seconds 5
    } else {
        Write-Host "Warning: up.ps1 not found, continuing with existing backend state..." -ForegroundColor Yellow
    }
}

if (-not $SkipSeed) {
    Write-Host "[2/3] Preparing/Seeding test data (Backend)..." -ForegroundColor Yellow
    
    $PythonCmd = "python"
    $VenvPath = Join-Path $BackendDir "venv\Scripts\python.exe"
    if (Test-Path $VenvPath) {
        $PythonCmd = $VenvPath
        Write-Host "Using Virtual Environment: $VenvPath" -ForegroundColor Gray
    }

    if (Test-Path (Join-Path $BackendDir "scripts/seed_test_db.py")) {
        Push-Location $BackendDir
        & $PythonCmd scripts/seed_test_db.py
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Seed successful." -ForegroundColor Green
        }
        else {
            Write-Host "Warning: Seed script failed (Exit Code: $LASTEXITCODE)." -ForegroundColor Gray
        }
        Pop-Location
    }
    else {
        Write-Host "Warning: Seed script not found at backend/scripts/seed_test_db.py" -ForegroundColor Yellow
    }
}
else {
    Write-Host "[2/3] Skipping Seed..." -ForegroundColor Gray
}

# 3. Port Cleanup (Ensure 3000 is available for Playwright)
Write-Host "[3/4] Ensuring port 3000 is available..." -ForegroundColor Yellow
$Port3000Line = netstat -ano | findstr :3000 | select-string "LISTENING" | Select-Object -First 1
if ($Port3000Line) {
    $PidMatch = [regex]::Match($Port3000Line.ToString(), "\d+$")
    if ($PidMatch.Success) {
        $ActivePid = $PidMatch.Value
        Write-Host "Found process $ActivePid on port 3000. Cleaning up..." -ForegroundColor Gray
        Stop-Process -Id $ActivePid -Force -ErrorAction SilentlyContinue
    }
}

# 4. Execution
Write-Host "[4/4] Launching Playwright Tests..." -ForegroundColor Cyan
$env:PORT = "3000"

# Note: Playwright's webServer config handles starting and waiting for the Next.js dev server.

$workersArg = 4
if ($env:CI -eq 'true') { $workersArg = 1 } # keep stable in CI by default
$playwrightCmd = "npx playwright test --grep-invert 'diagnostic|Instrumentation' --workers=$workersArg --retries=2 --timeout=120000"
Write-Host "Executing: $playwrightCmd" -ForegroundColor Gray
Invoke-Expression "$playwrightCmd | Tee-Object -FilePath '$LogFile'"

$ExitCode = $LASTEXITCODE

# Extra retry for transient ci/environment failures
if ($ExitCode -ne 0) {
    Write-Host "Transient failure detected, retrying Playwright suite once more..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Invoke-Expression $playwrightCmd
    $ExitCode = $LASTEXITCODE
}

if ($ExitCode -eq 0) {
    Write-Host "`nWINNER! All tests passed." -ForegroundColor Green
}
else {
    Write-Host "`nFAILURE. Some tests failed. Check the Playwright report." -ForegroundColor Red
}

Pop-Location
exit $ExitCode
