# HARIKERJA Mobile Master Test Runner
# This script executes both Flutter unit tests and Flutter E2E tests for the mobile app.

param (
    [switch]$SkipE2E,      # Skip Flutter E2E tests
    [switch]$SkipUnit      # Skip Flutter Unit tests
)

$ErrorActionPreference = "Stop"
$InternalScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
$MobileDir = Split-Path -Parent -Path $InternalScriptDir
Push-Location $MobileDir

# Ensuring log directory exists
$LogDir = Join-Path $MobileDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("master_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

# Start capturing all output for this orchestration run
Start-Transcript -Path $LogFile -Append
try {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "[MOBILE] HARIKERJA MOBILE TEST ORCHESTRATOR" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

$allPassed = $true

# 1. Run Unit Tests (Flutter)
if (-not $SkipUnit) {
    Write-Host "`n[1/2] Running Unit Tests (Flutter)..." -ForegroundColor Yellow
    & ".\scripts\run_unit_tests.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] Unit Tests Failed." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "[PASS] Unit Tests Passed." -ForegroundColor Green
    }
}

# 2. Run E2E Tests (Flutter)
if ($allPassed -and -not $SkipE2E) {
    Write-Host "`n[2/2] Running E2E Tests (Flutter)..." -ForegroundColor Yellow
    & ".\scripts\run_e2e_tests.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAIL] E2E Tests Failed." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "[PASS] E2E Tests Passed." -ForegroundColor Green
    }
}

} finally {
    Stop-Transcript
    Pop-Location
}

if ($allPassed) {
    Write-Host "`n[SUCCESS] ALL HARIKERJA MOBILE TESTS PASSED." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n[FAILURE] SOME HARIKERJA MOBILE TESTS FAILED." -ForegroundColor Red
    exit 1
}
