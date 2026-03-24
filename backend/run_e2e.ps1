# HRMS Backend End-to-End (E2E) Test Runner
# This script runs tests against a LIVE/Running server.
# Default: http://localhost:8000

$ErrorActionPreference = "Stop"

$BackendDir = Get-Location
$VenvDir = Join-Path $BackendDir "venv"
$PytestExec = Join-Path $VenvDir "Scripts\pytest.exe"

Write-Host "--- HRMS Backend E2E Test Suite ---" -ForegroundColor Cyan

# 1. Check if server is running
Write-Host "Checking if server is running on localhost:8000..." -ForegroundColor Yellow
$serverTest = Test-NetConnection -ComputerName "localhost" -Port 8000 -InformationLevel Quiet
if (-not $serverTest) {
    Write-Host "ERROR: Backend server is NOT running on localhost:8000." -ForegroundColor Red
    Write-Host "Please run 'pwsh ./run_dev.ps1' in a separate terminal first!" -ForegroundColor Yellow
    exit 1
}

# 2. Virtual Environment Check
if (-not (Test-Path $PytestExec)) {
    Write-Host "pytest not found in $VenvDir. Please ensure venv is setup." -ForegroundColor Red
    exit 1
}

# 3. Run Pytest with E2E marker
Write-Host "Running E2E tests targetting localhost:8000..." -ForegroundColor Green
& $PytestExec -m e2e tests_e2e/

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ E2E TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "`n❌ E2E TESTS FAILED" -ForegroundColor Red
    exit 1
}
