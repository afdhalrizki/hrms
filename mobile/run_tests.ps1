# Run all Flutter unit tests with detailed reporting
Write-Host "🚀 Starting Mobile Unit Test Suite (Detailed Reporting)..." -ForegroundColor Cyan

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

$globalPassed = 0
$globalFailed = 0
$globalErrors = 0
$globalWarnings = 0
$failedFiles = @()

foreach ($file in $testFiles) {
    Write-Host "`n[RUNNING] $file" -ForegroundColor Yellow
    
    # Run flutter test with JSON reporter to capture granular results
    $rawOutput = & flutter test --reporter json $file 2>&1
    
    $filePassed = 0
    $fileFailed = 0
    $fileErrors = 0
    $fileReasons = @()
    $hasWarning = $false
    $foundResults = $false
    
    # Track test names by ID
    $testNames = @{}

    foreach ($line in $rawOutput) {
        $lineStr = $line.ToString().Trim()
        
        # Detect Warnings
        if ($lineStr -match "(?i)warning") { 
            $hasWarning = $true; 
            if ($lineStr -notmatch '^{.*}$') {
                $fileReasons += "    ⚠️ $lineStr"
            }
        }

        # Parse JSON events
        if ($lineStr.StartsWith("{") -and $lineStr.EndsWith("}")) {
            try {
                $evt = $lineStr | ConvertFrom-Json -ErrorAction SilentlyContinue
                if (!$evt) { continue }

                if ($evt.type -eq "testStart" -and $evt.test.name) {
                    $testNames[$evt.test.id] = $evt.test.name
                }

                if ($evt.type -eq "error") {
                    $name = if ($testNames.ContainsKey($evt.testID)) { $testNames[$evt.testID] } else { "Unknown Test" }
                    $fileReasons += "    ❌ [$name]: $($evt.error)"
                }

                if ($evt.type -eq "testDone") {
                    # Ignore the 'loading' test (test ID 0)
                    if ($evt.testID -eq 0) { continue }
                    
                    $foundResults = $true
                    if ($evt.result -eq "success") { $filePassed++ }
                    elseif ($evt.result -eq "failure") { $fileFailed++ }
                    elseif ($evt.result -eq "error") { $fileErrors++ }
                }
            } catch { }
        }
    }

    $globalPassed += $filePassed
    $globalFailed += $fileFailed
    $globalErrors += $fileErrors
    if ($hasWarning) { $globalWarnings++ }

    if ($fileFailed -gt 0 -or $fileErrors -gt 0 -or $foundResults -eq $false) {
        $failedFiles += $file
        if ($foundResults) {
            Write-Host "  ❌ Result: FAILED ($filePassed passed, $fileFailed failed, $fileErrors errors)" -ForegroundColor Red
        } else {
             Write-Host "  ❌ Result: ERROR (No tests found or build failed)" -ForegroundColor Red
             $globalErrors++
        }
        # Display Reasons
        foreach ($reason in $fileReasons) {
            Write-Host $reason -ForegroundColor Gray
        }
    } else {
        $warnText = if ($hasWarning) { " (⚠️ with warnings)" } else { "" }
        Write-Host "  ✅ Result: PASSED ($filePassed passed)$warnText" -ForegroundColor Green
        if ($hasWarning) {
            foreach ($reason in $fileReasons) { Write-Host $reason -ForegroundColor Gray }
        }
    }
}

Write-Host "`n========================================" -ForegroundColor White
Write-Host "🏁 FINAL TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor White
Write-Host "✅ TOTAL PASSED:   $globalPassed" -ForegroundColor Green
Write-Host "❌ TOTAL FAILED:   $globalFailed" -ForegroundColor Red
Write-Host "⚠️ TOTAL ERRORS:   $globalErrors" -ForegroundColor Magenta
Write-Host "🔍 TOTAL WARNINGS: $globalWarnings" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor White

Pop-Location

if ($failedFiles.Count -eq 0 -and $globalErrors -eq 0) {
    Write-Host "🏆 100% SUCCESS" -ForegroundColor Green
    exit 0
} else {
    Write-Host "💀 SOME TESTS FAILED IN THE FOLLOWING FILES:" -ForegroundColor Red
    foreach ($f in $failedFiles) { Write-Host "  - $f" }
    exit 1
}
