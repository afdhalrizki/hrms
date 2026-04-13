# Mobile Master Test Orchestrator (PowerShell)
# Orchestrates Flutter unit and E2E tests for the mobile app.

param (
    [switch]$SkipE2E,      # Skip Flutter E2E tests
    [switch]$SkipUnit,     # Skip Flutter Unit tests
    [switch]$Integrated    # Run E2E tests in integrated mode
)

$ErrorActionPreference = "Stop"

$MobileDir = $PSScriptRoot
Push-Location $MobileDir

# Ensuring log directory exists
$LogDir = Join-Path $MobileDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$LogFile = Join-Path $LogDir ("master_test_$timestamp.log")

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🏆 HARIKERJA MOBILE TEST ORCHESTRATOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$allPassed = $true

# 1. Run Unit Tests (Flutter)
if (-not $SkipUnit) {
    Write-Host "`n🧪 [1/2] Running Unit Tests (Flutter)..." -ForegroundColor Yellow
    
    & pwsh -NoProfile -NoLogo -Command "& ./scripts/run_unit_tests.ps1" 2>&1 | Tee-Object -FilePath $LogFile -Append
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Write-Host "❌ Unit Tests Failed." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "✅ Unit Tests Passed." -ForegroundColor Green
    }
}

# 2. Run E2E Tests (Flutter)
if ($allPassed -and -not $SkipE2E) {
    Write-Host "`n🌐 [2/2] Running E2E Tests (Flutter)..." -ForegroundColor Yellow
    
    $e2eArgs = if ($Integrated) { "-Integrated" } else { "" }
    & pwsh -NoProfile -NoLogo -Command "& ./scripts/run_e2e_tests.ps1 $e2eArgs" 2>&1 | Tee-Object -FilePath $LogFile -Append
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        Write-Host "❌ E2E Tests Failed." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "✅ E2E Tests Passed." -ForegroundColor Green
    }
}

if ($allPassed) {
    Write-Host "`n🏆 ALL HARIKERJA MOBILE TESTS PASSED." -ForegroundColor Green
    Pop-Location
    exit 0
} else {
    Write-Host "`n💀 SOME HARIKERJA MOBILE TESTS FAILED." -ForegroundColor Red
    Pop-Location
    exit 1
}
