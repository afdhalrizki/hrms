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
$unitPassed = 0
$unitFailed = 0
$unitTotal = 0
$unitWarnings = 0
$e2ePassed = 0
$e2eFailed = 0
$e2eTotal = 0
$e2eWarnings = 0
$totalErrors = 0
$unitResultsFile = Join-Path $LogDir "unit_results.json"
$e2eResultsFile = Join-Path $LogDir "e2e_results.json"

# Remove old results if they exist
if (Test-Path $unitResultsFile) { Remove-Item $unitResultsFile }
if (Test-Path $e2eResultsFile) { Remove-Item $e2eResultsFile }

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

    if (Test-Path $unitResultsFile) {
        try {
            $unitJson = Get-Content $unitResultsFile | ConvertFrom-Json
            $unitPassed = $unitJson.numPassedTests
            $unitFailed = $unitJson.numFailedTests
            $unitTotal = $unitJson.numTotalTests
            
            # Scan for warnings in the specific unit log
            $latestUnitLog = Get-ChildItem -Path $LogDir -Filter "unit_test_*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($latestUnitLog) {
                $unitWarnings = (Select-String -Path $latestUnitLog.FullName -Pattern "warning", "Warning", "WARNING" -ErrorAction SilentlyContinue | Measure-Object).Count
            }
        } catch {
            Write-Host "Warning: Failed to parse unit results JSON." -ForegroundColor Gray
        }
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

    if (Test-Path $e2eResultsFile) {
        try {
            $e2eJson = Get-Content $e2eResultsFile | ConvertFrom-Json
            $e2ePassed = $e2eJson.stats.expected
            $e2eFailed = $e2eJson.stats.unexpected
            $e2eTotal = ($e2eJson.stats.expected + $e2eJson.stats.unexpected + $e2eJson.stats.flaky + $e2eJson.stats.skipped)
            $totalErrors += ($e2eJson.errors.Count)
            
            # Scan for warnings in the specific E2E log
            $latestE2ELog = Get-ChildItem -Path $LogDir -Filter "e2e_test_*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($latestE2ELog) {
                $e2eWarnings = (Select-String -Path $latestE2ELog.FullName -Pattern "warning", "Warning", "WARNING" -ErrorAction SilentlyContinue | Measure-Object).Count
            }
        } catch {
            Write-Host "Warning: Failed to parse E2E results JSON." -ForegroundColor Gray
        }
    }
}

} finally {
    Stop-Transcript
    Pop-Location
}

if ($allPassed) {
    Write-Host "`n🏆 ALL HARIKERJA FRONTEND TESTS PASSED." -ForegroundColor Green
} else {
    Write-Host "`n💀 SOME HARIKERJA FRONTEND TESTS FAILED." -ForegroundColor Red
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "                TEST RUN SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray

# Unit Tests Breakdown
$unitPercent = if ($unitTotal -gt 0) { [math]::Round(($unitPassed / $unitTotal) * 100, 1) } else { 0 }
Write-Host "[Unit Tests]" -ForegroundColor White
Write-Host ("  Tests   : {0} / {1}" -f $unitPassed, $unitTotal) -NoNewline
Write-Host (" ({0}%)" -f $unitPercent) -ForegroundColor ($unitPercent -eq 100 ? "Green" : ($unitPercent -gt 80 ? "Yellow" : "Red"))
Write-Host ("  Failed  : {0}" -f $unitFailed) -ForegroundColor ($unitFailed -gt 0 ? "Red" : "Gray")
Write-Host ("  Warnings: {0}" -f $unitWarnings) -ForegroundColor ($unitWarnings -gt 0 ? "Yellow" : "Gray")

# E2E Tests Breakdown
$e2ePercent = if ($e2eTotal -gt 0) { [math]::Round(($e2ePassed / $e2eTotal) * 100, 1) } else { 0 }
Write-Host "`n[E2E Tests]" -ForegroundColor White
Write-Host ("  Tests   : {0} / {1}" -f $e2ePassed, $e2eTotal) -NoNewline
Write-Host (" ({0}%)" -f $e2ePercent) -ForegroundColor ($e2ePercent -eq 100 ? "Green" : ($e2ePercent -gt 80 ? "Yellow" : "Red"))
Write-Host ("  Failed  : {0}" -f $e2eFailed) -ForegroundColor ($e2eFailed -gt 0 ? "Red" : "Gray")
Write-Host ("  Warnings: {0}" -f $e2eWarnings) -ForegroundColor ($e2eWarnings -gt 0 ? "Yellow" : "Gray")

# Combined Total
$totalPass = $unitPassed + $e2ePassed
$grandTotal = $unitTotal + $e2eTotal
$overallPercent = if ($grandTotal -gt 0) { [math]::Round(($totalPass / $grandTotal) * 100, 1) } else { 0 }

Write-Host ("-" * 60) -ForegroundColor Gray
Write-Host ("OVERALL SUCCESS: {0}%" -f $overallPercent) -ForegroundColor ($overallPercent -eq 100 ? "Green" : "Red")
Write-Host ("TOTAL ERRORS   : {0}" -f $totalErrors) -ForegroundColor ($totalErrors -gt 0 ? "Red" : "Gray")

if ($overallPercent -eq 100) {
    Write-Host " STATUS  : ✅ ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host " STATUS  : ❌ SOME TESTS FAILED OR SKIPPED" -ForegroundColor Red
}
Write-Host ("=" * 60) -ForegroundColor Gray

if ($allPassed) { exit 0 } else { exit 1 }
