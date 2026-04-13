# HARIKERJA Backend Test Orchestrator (PowerShell)
# Orchestrates Unit and E2E tests for the backend.

param(
    [switch]$SkipUnit,
    [switch]$SkipE2E,
    [switch]$DockerOnly,
    [switch]$ResetDocker,
    [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

$BackendDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$LogDir = Join-Path $BackendDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$masterLogFile = Join-Path $LogDir "master_test_$timestamp.log"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🏆 HARIKERJA BACKEND TEST ORCHESTRATOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Master log: $masterLogFile" -ForegroundColor Gray

$allPassed = $true

# 1. Run Unit Tests
if (-not $SkipUnit) {
    Write-Host "`n🧪 [1/2] Running Unit Tests (Pytest)..." -ForegroundColor Yellow
    
    $unitArgs = @()
    if ($DockerOnly) { $unitArgs += "-DockerOnly" }
    if ($ResetDocker) { $unitArgs += "-ResetDocker" }
    if ($SkipDocker) { $unitArgs += "-SkipDocker" }

    Push-Location $PSScriptRoot
    & pwsh -NoProfile -NoLogo -Command "& ./run_unit_tests.ps1 $unitArgs" 2>&1 | Tee-Object -FilePath $masterLogFile -Append
    $exitCode = $LASTEXITCODE
    Pop-Location

    if ($exitCode -ne 0) {
        Write-Host "❌ Unit Tests Failed." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "✅ Unit Tests Passed." -ForegroundColor Green
    }
}

# 2. Run E2E Tests
if ($allPassed -and -not $SkipE2E -and -not $DockerOnly) {
    Write-Host "`n🌐 [2/2] Running E2E Tests (Pytest)..." -ForegroundColor Yellow
    
    $e2eArgs = @()
    if ($SkipDocker) { $e2eArgs += "-SkipDocker" }

    Push-Location $PSScriptRoot
    & pwsh -NoProfile -NoLogo -Command "& ./run_e2e_tests.ps1 $e2eArgs" 2>&1 | Tee-Object -FilePath $masterLogFile -Append
    $exitCode = $LASTEXITCODE
    Pop-Location

    if ($exitCode -ne 0) {
        Write-Host "❌ E2E Tests Failed." -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "✅ E2E Tests Passed." -ForegroundColor Green
    }
}

if ($allPassed) {
    Write-Host "`n🏆 ALL HARIKERJA BACKEND TESTS PASSED." -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n💀 SOME HARIKERJA BACKEND TESTS FAILED." -ForegroundColor Red
    exit 1
}
