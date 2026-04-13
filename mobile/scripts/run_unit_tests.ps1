# Mobile Unit Test Runner (PowerShell)
# Orchestrates all Flutter unit tests at once.

$ErrorActionPreference = "Stop"

$MobileDir = $PSScriptRoot
Push-Location $MobileDir

Write-Host "🚀 Starting Mobile Unit Test Suite (Merged) ..." -ForegroundColor Cyan

# Ensuring log directory exists
$LogDir = Join-Path $MobileDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$LogFile = Join-Path $LogDir ("unit_test_$timestamp.log")

Write-Host "Running flutter test with JSON reporter (all unit tests)..." -ForegroundColor Yellow
Write-Host "Logging output to: $LogFile" -ForegroundColor Gray

$testFiles = @(
    'test/api_service_test.dart',
    'test/attendance_logic_test.dart',
    'test/basic_test.dart',
    'test/correction_logic_test.dart',
    'test/face_verification_test.dart',
    'test/file_service_test.dart',
    'test/l10n_additional_test.dart',
    'test/leave_logic_test.dart',
    'test/location_service_test.dart',
    'test/model_test.dart',
    'test/models_additional_test.dart',
    'test/models_test.dart',
    'test/payslip_logic_test.dart',
    'test/performance_logic_test.dart',
    'test/profile_logic_test.dart',
    'test/reimbursement_logic_test.dart',
    'test/screens_widget_test.dart',
    'test/service_test.dart',
    'test/settings_screen_test.dart'
)

$filePassed = 0; $fileFailed = 0; $fileErrors = 0; $hasWarning = $false
$foundResults = $false; $testNames = @{}; $fileReasons = @()

& flutter test --reporter json $testFiles 2>&1 | Tee-Object -FilePath $LogFile | ForEach-Object {
    $line = $_.ToString().Trim()
    if ($line -match "(?i)warning") { $hasWarning = $true }

    if ($line.StartsWith("{") -and $line.EndsWith("}")) {
        try {
            $evt = $line | ConvertFrom-Json
            if ($evt.type -eq "testStart" -and $evt.test.name) {
                $testNames[$evt.test.id] = $evt.test.name
                if ($evt.test.name -notmatch "loading") { Write-Host "🧪 $($evt.test.name) ... " -NoNewline }
            }
            if ($evt.type -eq "error") {
                $name = if ($testNames.ContainsKey($evt.testID)) { $testNames[$evt.testID] } else { "Unknown" }
                Write-Host "❌ ERROR" -ForegroundColor Red
                $fileReasons += "    ❌ [$name]: $($evt.error)"
            }
            if ($evt.type -eq "testDone") {
                if ($evt.testID -eq 0) { return }
                $foundResults = $true
                if ($evt.result -eq "success") { $filePassed++; Write-Host "✅" -ForegroundColor Green }
                elseif ($evt.result -eq "failure") { $fileFailed++; Write-Host "❌" -ForegroundColor Red }
                elseif ($evt.result -eq "error") { $fileErrors++; Write-Host "⚠️" -ForegroundColor Magenta }
            }
        } catch {}
    }
}

Write-Host "`n========================================" -ForegroundColor White
Write-Host "🏁 FINAL MOBILE UNIT SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor White
Write-Host "✅ TOTAL PASSED:   $filePassed" -ForegroundColor Green
Write-Host "❌ TOTAL FAILED:   $fileFailed" -ForegroundColor Red
Write-Host "⚠️ TOTAL ERRORS:   $fileErrors" -ForegroundColor Magenta
Write-Host "🔍 WARNINGS:       $(if ($hasWarning) {1} else {0})" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor White

if ($fileFailed -gt 0 -or $fileErrors -gt 0) { $fileReasons | ForEach-Object { Write-Host $_ -ForegroundColor Gray } }

Pop-Location
if ($fileFailed -eq 0 -and $fileErrors -eq 0) {
    if ($foundResults) { Write-Host "🏆 100% SUCCESS" -ForegroundColor Green }
    else { Write-Host "ℹ️ NO TESTS FOUND" -ForegroundColor Blue }
    exit 0
} else {
    Write-Host "💀 SOME TESTS FAILED" -ForegroundColor Red
    exit 1
}
