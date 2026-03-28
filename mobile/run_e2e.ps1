# Run Flutter E2E tests with detailed reporting
Write-Host "`n🚀 Running Mobile End-to-End Tests (Detailed Reporting)..." -ForegroundColor Cyan

# Ensure we are in the mobile directory
Push-Location $PSScriptRoot

Write-Host "📦 Generating localizations..." -ForegroundColor Gray
& flutter gen-l10n 2>$null

# Hybrid VM mode is the most reliable for real-backend integration in this environment.
$file = "test/e2e_test.dart"
Write-Host "[RUNNING] $file" -ForegroundColor Yellow

$rawOutput = & flutter test --reporter json $file 2>&1

$filePassed = 0
$fileFailed = 0
$fileErrors = 0
$fileReasons = @()
$hasWarning = $false
$foundResults = $false
$testNames = @{}

foreach ($line in $rawOutput) {
    $lineStr = $line.ToString().Trim()
    
    # Detect Warnings
    if ($lineStr -match "(?i)warning") { 
        $hasWarning = $true; 
        if ($lineStr -notmatch '^{.*}$') { $fileReasons += "    ⚠️ $lineStr" }
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
                if ($evt.testID -eq 0) { continue }
                $foundResults = $true
                if ($evt.result -eq "success") { $filePassed++ }
                elseif ($evt.result -eq "failure") { $fileFailed++ }
                elseif ($evt.result -eq "error") { $fileErrors++ }
            }
        } catch { }
    }
}

Write-Host "`n========================================" -ForegroundColor White
Write-Host "🏁 E2E TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor White
Write-Host "✅ TOTAL PASSED:   $filePassed" -ForegroundColor Green
Write-Host "❌ TOTAL FAILED:   $fileFailed" -ForegroundColor Red
Write-Host "⚠️ TOTAL ERRORS:   $fileErrors" -ForegroundColor Magenta
Write-Host "🔍 TOTAL WARNINGS: $(if ($hasWarning) { 1 } else { 0 })" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor White

if ($fileFailed -gt 0 -or $fileErrors -gt 0) {
    # Display Reasons
    foreach ($reason in $fileReasons) { Write-Host $reason -ForegroundColor Gray }
}

Pop-Location

if ($fileFailed -eq 0 -and $fileErrors -eq 0 -and $foundResults) {
    Write-Host "🏆 E2E SUCCESS" -ForegroundColor Green
    exit 0
} else {
    Write-Host "💀 E2E TEST FAILED" -ForegroundColor Red
    exit 1
}
