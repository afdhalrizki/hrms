# Master HRMS Test Suite Orchestrator
# Executes all test suites (Backend, Frontend, Mobile) and provides a unified report.

$ErrorActionPreference = "Continue" 
$RootDir = $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🏆 HRMS MASTER TEST ORCHESTRATOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# --- 1. Infrastructure Preparation ---
Write-Host "🔧 Preparing Global environment..." -ForegroundColor Yellow
# Ensure Docker is up (reusing backend script logic)
Push-Location (Join-Path $RootDir "backend")
.\run_tests.ps1 --help > $null # Just to trigger Docker auto-start if needed
Pop-Location

# --- 2. Start Background Backend Server (for E2E) ---
Write-Host "🚀 Starting Backend Server in background (for E2E tests)..." -ForegroundColor Yellow
$BackendDevJob = Start-Job -ScriptBlock {
    param($path)
    Push-Location $path
    pwsh ./run_dev.ps1
} -ArgumentList (Join-Path $RootDir "backend")

# Wait for server to be ready
$maxWait = 60 # 60 seconds
$waited = 0
$serverReady = $false
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 2
    $test = Test-NetConnection -ComputerName "127.0.0.1" -Port 8000 -InformationLevel Quiet
    if ($test) {
        $serverReady = $true
        Write-Host "`n✅ Backend Server is READY!" -ForegroundColor Green
        break
    }
    Write-Host "." -NoNewline -ForegroundColor Gray
    $waited += 2
}

if (-not $serverReady) {
    Write-Host "`n❌ ERROR: Backend server failed to start in time." -ForegroundColor Red
    Stop-Job $BackendDevJob
    exit 1
}

# --- 3. Execute Suites ---
$suites = @(
    @{ Name = "Backend Unit (Django)"; Path = "backend\run_tests.ps1" },
    @{ Name = "Backend E2E (Pytest)"; Path = "backend\run_e2e.ps1" },
    @{ Name = "Frontend Unit (Vitest)"; Path = "frontend\run_tests.ps1" },
    @{ Name = "Frontend E2E (Playwright)"; Path = "frontend\run_e2e.ps1" },
    @{ Name = "Mobile Unit (Flutter)"; Path = "mobile\run_tests.ps1" },
    @{ Name = "Mobile E2E (Flutter)"; Path = "mobile\run_e2e.ps1" }
)

$results = @()
$allPassed = $true

try {
    foreach ($s in $suites) {
        Write-Host "`n🚀 RUNNING: $($s.Name)" -ForegroundColor Yellow
        Write-Host "----------------------------------------" -ForegroundColor Gray
        
        $fullPath = Join-Path $RootDir $s.Path
        $dir = Split-Path $fullPath
        
        Push-Location $dir
        # We use '&' to run the script in the same session but capture exit code
        & pwsh (Split-Path $fullPath -Leaf)
        $exitCode = $LASTEXITCODE
        Pop-Location
        
        $status = if ($exitCode -eq 0) { "✅ PASSED" } else { "❌ FAILED"; $allPassed = $false }
        $results += [PSCustomObject]@{
            Suite  = $s.Name
            Status = $status
            Exit   = $exitCode
        }
    }
} finally {
    # --- 4. Cleanup ---
    Write-Host "`n🧼 Cleaning up background processes..." -ForegroundColor Yellow
    Stop-Job $BackendDevJob
    # Explicitly kill the runserver process (it often detaches from the job)
    $serverProc = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($serverProc) {
        Stop-Process -Id $serverProc.OwningProcess -Force -ErrorAction SilentlyContinue
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
    Write-Host "💀 SOME SUITES FAILED. Please check logs for details." -ForegroundColor Red
    exit 1
}
