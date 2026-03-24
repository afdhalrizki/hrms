# Playwright E2E Master Script
# Usage: .\run_e2e.ps1 [-Live] [-SkipInstall] [-SkipSeed]

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

# 1. Dependency Check
if (-not $SkipInstall) {
    Write-Host "[1/3] Checking Frontend Dependencies..." -ForegroundColor Yellow
    npm install
    npx playwright install chromium
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
        # Wait for DB
        Start-Sleep -Seconds 5
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

    if (Test-Path (Join-Path $BackendDir "scripts/seed_test_frontend.py")) {
        Push-Location $BackendDir
        & $PythonCmd scripts/seed_test_frontend.py
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Seed successful." -ForegroundColor Green
        } else {
            Write-Host "Warning: Seed script failed (Exit Code: $LASTEXITCODE)." -ForegroundColor Gray
        }
        Pop-Location
    } else {
        Write-Host "Warning: Seed script not found at backend/scripts/seed_test_frontend.py" -ForegroundColor Yellow
    }
} else {
    Write-Host "[2/3] Skipping Seed..." -ForegroundColor Gray
}

# 3. Execution
Write-Host "[3/3] Launching Playwright Tests..." -ForegroundColor Cyan
# grep-invert to skip heavy diagnostic tests if needed, workers=1 for stability
npx playwright test --grep-invert "diagnostic|Instrumentation" --workers=1

$ExitCode = $LASTEXITCODE

if ($ExitCode -eq 0) {
    Write-Host "`nWINNER! All tests passed." -ForegroundColor Green
} else {
    Write-Host "`nFAILURE. Some tests failed. Check the Playwright report." -ForegroundColor Red
}

Pop-Location
exit $ExitCode
