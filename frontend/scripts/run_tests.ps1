# HARIKERJA Frontend Master Test Orchestrator (PowerShell)
# This script executes both Vitest Unit tests and Playwright E2E tests for the frontend.

param (
    [switch]$SkipE2E,      # Skip Playwright E2E tests
    [switch]$SkipUnit,     # Skip Vitest Unit tests
    [switch]$SkipInstall,  # Skip npm install check
    [switch]$Coverage,     # Run with coverage report
    [switch]$Live          # Run Playwright tests against real backend
)

$ErrorActionPreference = "Stop"

$FrontendDir = Split-Path -Parent $PSScriptRoot
Push-Location $FrontendDir

# Ensuring log directory exists
$LogDir = Join-Path $FrontendDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$LogFile = Join-Path $LogDir "master_test_$timestamp.log"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🏆 HARIKERJA FRONTEND TEST ORCHESTRATOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$allPassed = $true
$unitPassed = 0; $unitFailed = 0; $unitTotal = 0; $unitWarnings = 0
$e2ePassed = 0; $e2eFailed = 0; $e2eTotal = 0; $e2eWarnings = 0; $totalErrors = 0

$unitResultsFile = Join-Path $LogDir "unit_results.json"
$e2eResultsFile = Join-Path $LogDir "e2e_results.json"

# Dependency Check
if (-not $SkipInstall) {
    Write-Host "[0/2] Checking Frontend Dependencies..." -ForegroundColor Yellow
    npm install
}

# 1. Run Unit Tests (Vitest)
if (-not $SkipUnit) {
    Write-Host "`n🧪 [1/2] Running Unit Tests (Vitest)..." -ForegroundColor Yellow
    $unitArgs = @("-SkipInstall")
    if ($Coverage) { $unitArgs += "-Coverage" }

    & pwsh -NoProfile -NoLogo -Command "& ./scripts/run_unit_tests.ps1 $unitArgs" 2>&1 | Tee-Object -FilePath $LogFile -Append
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
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
        } catch { }
    }
}

# 2. Run E2E Tests (Playwright)
if ($allPassed -and -not $SkipE2E) {
    Write-Host "`n🌐 [2/2] Running E2E Tests (Playwright)..." -ForegroundColor Yellow
    $e2eArgs = @("-SkipInstall")
    if ($Live) { $e2eArgs += "-Live" }

    & pwsh -NoProfile -NoLogo -Command "& ./scripts/run_e2e_tests.ps1 $e2eArgs" 2>&1 | Tee-Object -FilePath $LogFile -Append
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
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
            $totalErrors = $e2eJson.errors.Count
        } catch { }
    }
}

# Summary
Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "                TEST RUN SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray

function Print-Breakdown($label, $passed, $total, $failed) {
    $percent = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 1) } else { 0 }
    $color = if ($percent -eq 100) { "Green" } elseif ($percent -gt 80) { "Yellow" } else { "Red" }
    Write-Host "[$label]" -ForegroundColor White
    Write-Host ("  Tests   : {0} / {1}" -f $passed, $total) -NoNewline
    Write-Host (" ({0}%)" -f $percent) -ForegroundColor $color
    Write-Host ("  Failed  : {0}" -f $failed) -ForegroundColor (if ($failed -gt 0) { "Red" } else { "Gray" })
}

Print-Breakdown "Unit Tests" $unitPassed $unitTotal $unitFailed
Write-Host ""
Print-Breakdown "E2E Tests" $e2ePassed $e2eTotal $e2eFailed

$totalPass = $unitPassed + $e2ePassed
$grandTotal = $unitTotal + $e2eTotal
$overallPercent = if ($grandTotal -gt 0) { [math]::Round(($totalPass / $grandTotal) * 100, 1) } else { 0 }

Write-Host ("-" * 60) -ForegroundColor Gray
Write-Host ("OVERALL SUCCESS: {0}%" -f $overallPercent) -ForegroundColor (if ($overallPercent -eq 100) { "Green" } else { "Red" })
Write-Host ("TOTAL ERRORS   : {0}" -f $totalErrors) -ForegroundColor (if ($totalErrors -gt 0) { "Red" } else { "Gray" })

if ($overallPercent -eq 100) {
    Write-Host " STATUS  : ✅ ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host " STATUS  : ❌ SOME TESTS FAILED OR SKIPPED" -ForegroundColor Red
}
Write-Host ("=" * 60) -ForegroundColor Gray

Pop-Location
if ($allPassed) { exit 0 } else { exit 1 }
