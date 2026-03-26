# HRMS Backend End-to-End (E2E) Test Runner
# This script runs tests against a LIVE/Running server.
# Default: http://localhost:8000

$ErrorActionPreference = "Stop"

$BackendDir = $PSScriptRoot
$VenvDir = Join-Path $BackendDir "venv"
$PytestExec = Join-Path $VenvDir "Scripts\pytest.exe"
$PythonExec = Join-Path $VenvDir "Scripts\python.exe"

Push-Location $BackendDir

Write-Host "--- HRMS Backend E2E Test Suite ---" -ForegroundColor Cyan

# 1. Check if server is running
Write-Host "Checking if server is running on localhost:8000..." -ForegroundColor Yellow
$serverTest = Test-NetConnection -ComputerName "127.0.0.1" -Port 8000 -InformationLevel Quiet
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

# 2. Seed Test Data
Write-Host "Seeding test database..." -ForegroundColor Cyan
& $PythonExec "$PSScriptRoot\scripts\seed_test_db.py"

# 3. Run Pytest with E2E marker
Write-Host "Running E2E tests targetting localhost:8000..." -ForegroundColor Green

# Create a temporary file to capture output for parsing
$tempFile = [System.IO.Path]::GetTempFileName()
try {
    # Dynamically detect terminal width for better alignment when piped
    $termWidth = if ($Host.UI.RawUI.WindowSize.Width -gt 0) { $Host.UI.RawUI.WindowSize.Width } else { 120 }

    # Force color output and pass detected terminal width
    & $PytestExec --color=yes -o "terminal_width=$termWidth" -m e2e tests_e2e/ | Tee-Object -FilePath $tempFile
    $exitCode = $LASTEXITCODE

    # 4. Final Summary Parsing
    $finalLines = Get-Content $tempFile -Tail 10
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
    if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
}

Pop-Location
exit $exitCode
