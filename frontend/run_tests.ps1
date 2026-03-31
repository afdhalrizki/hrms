# HARIKERJA Frontend Master Test Runner
# This script executes both Vitest Unit tests and Playwright E2E tests for the frontend.

param (
    [switch]$SkipE2E,      # Skip Playwright E2E tests
    [switch]$SkipUnit,     # Skip Vitest Unit tests
    [switch]$SkipInstall,  # Skip npm install check
    [switch]$Coverage,      # Run with coverage report
    [switch]$Live        # Run Playwright tests against real backend
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Push-Location $ScriptDir

# Ensuring log directory exists
$LogDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("master_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

# Start capturing all output for this orchestration run
Start-Transcript -Path $LogFile -Append
try {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "🏆 HARIKERJA FRONTEND TEST ORCHESTRATOR" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

$allPassed = $true

# 1. Dependency Check
if (-not $SkipInstall) {
    Write-Host "[0/2] Checking Frontend Dependencies..." -ForegroundColor Yellow
    npm install
}

# 2. Run Unit Tests (Vitest)
if (-not $SkipUnit) {
    Write-Host "`n🧪 [1/2] Running Unit Tests (Vitest)..." -ForegroundColor Yellow
    $unitArgs = @("-SkipInstall")
    if ($Coverage) { $unitArgs += "-Coverage" }

    & ".\run_unit_tests.ps1" @unitArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Unit Tests Failed." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "✅ Unit Tests Passed." -ForegroundColor Green
    }
}

# 3. Run E2E Tests (Playwright)
if ($allPassed -and -not $SkipE2E) {
    Write-Host "`n🌐 [2/2] Running E2E Tests (Playwright)..." -ForegroundColor Yellow
    $e2eArgs = @("-SkipInstall")
    if ($Live) { $e2eArgs += "-Live" }

    & ".\run_e2e_tests.ps1" @e2eArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ E2E Tests Failed." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "✅ E2E Tests Passed." -ForegroundColor Green
    }
}

} finally {
    Stop-Transcript
    Pop-Location
}

if ($allPassed) {
    Write-Host "`n🏆 ALL HARIKERJA FRONTEND TESTS PASSED." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n💀 SOME HARIKERJA FRONTEND TESTS FAILED." -ForegroundColor Red
    exit 1
}
