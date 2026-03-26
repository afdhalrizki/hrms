# Run all Flutter unit tests for the mobile app
Write-Host "🚀 Starting Mobile Unit Test Suite..." -ForegroundColor Cyan

# Ensure we are in the script's directory (Flutter project root)
Push-Location $PSScriptRoot

$testFiles = @(
    "test/api_service_test.dart",
    "test/attendance_logic_test.dart",
    "test/correction_logic_test.dart",
    "test/leave_logic_test.dart",
    "test/models_test.dart",
    "test/payslip_logic_test.dart",
    "test/performance_logic_test.dart",
    "test/profile_logic_test.dart",
    "test/reimbursement_logic_test.dart"
)

$failedTests = @()

foreach ($file in $testFiles) {
    Write-Host "`n[RUNNING] $file" -ForegroundColor Yellow
    flutter test $file
    if ($LASTEXITCODE -ne 0) {
        $failedTests += $file
        Write-Host "[FAILED] $file" -ForegroundColor Red
    } else {
        Write-Host "[PASSED] $file" -ForegroundColor Green
    }
}

Write-Host "`n----------------------------------------"
Pop-Location
if ($failedTests.Count -eq 0) {
    Write-Host "✅ ALL TESTS PASSED (100% Success)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ SOME TESTS FAILED:" -ForegroundColor Red
    foreach ($fail in $failedTests) {
        Write-Host "  - $fail" -ForegroundColor Gray
    }
    exit 1
}
