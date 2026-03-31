# HARIKERJA Backend Master Test Runner
# This script executes both Unit tests and E2E tests for the backend.

param(
    [switch]$SkipE2E,      # Skip E2E tests
    [switch]$SkipUnit,     # Skip Unit tests
    [switch]$DockerOnly,   # Only prepare Docker for Unit tests
    [switch]$ResetDocker   # Reset Docker containers
)

$ErrorActionPreference = "Stop"
$BackendDir = $PSScriptRoot
Push-Location $BackendDir

# Ensure log directory exists
$LogDir = Join-Path $BackendDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("master_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

$allPassed = $true

# Start capturing all output for this orchestration run
Start-Transcript -Path $LogFile -Append
try {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "🏆 HARIKERJA BACKEND TEST ORCHESTRATOR" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

# 1. Run Unit Tests
if (-not $SkipUnit) {
    Write-Host "`n🧪 [1/2] Running Unit Tests (Pytest)..." -ForegroundColor Yellow
    $unitArgs = @()
    if ($DockerOnly) { $unitArgs += "-DockerOnly" }
    if ($ResetDocker) { $unitArgs += "-ResetDocker" }

    & ".\run_unit_tests.ps1" @unitArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Unit Tests Failed." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "✅ Unit Tests Passed." -ForegroundColor Green
    }
}

# 2. Run E2E Tests
if ($allPassed -and -not $SkipE2E -and -not $DockerOnly) {
    Write-Host "`n🌐 [2/2] Running E2E Tests (Pytest)..." -ForegroundColor Yellow
    & ".\run_e2e_tests.ps1"
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
    Write-Host "`n🏆 ALL HARIKERJA BACKEND TESTS PASSED." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n💀 SOME HARIKERJA BACKEND TESTS FAILED." -ForegroundColor Red
    exit 1
}
