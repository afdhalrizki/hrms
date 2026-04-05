# Run all Flutter unit tests at once to reduce process startup overhead
Write-Host "🚀 Starting Mobile Unit Test Suite (Merged) ..." -ForegroundColor Cyan

Push-Location $PSScriptRoot

# Ensuring log directory exists
$LogDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("unit_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

Write-Host "Running flutter test with JSON reporter (single pass)..." -ForegroundColor Yellow
Write-Host "Logging output to: $LogFile" -ForegroundColor Gray
$rawOutput = & flutter test --reporter json 2>&1 | Tee-Object -FilePath $LogFile

$filePassed = 0
$fileFailed = 0
$fileErrors = 0
$hasWarning = $false
$foundResults = $false
$testNames = @{}
$fileReasons = @()

$foundResults = $false
$testNames = @{}
$fileReasons = @()

& flutter test --reporter json 2>&1 | Tee-Object -FilePath $LogFile | ForEach-Object {
    $lineStr = $_.ToString().Trim()

    if ($lineStr -match "(?i)warning") {
        $hasWarning = $true
        if ($lineStr -notmatch '^{.*}$') {
            $fileReasons += "    ⚠️ $lineStr"
        }
    }

    if ($lineStr.StartsWith("{") -and $lineStr.EndsWith("}")) {
        try {
            $evt = $lineStr | ConvertFrom-Json -ErrorAction SilentlyContinue
            if (!$evt) { return }

            if ($evt.type -eq "testStart" -and $evt.test.name) {
                $testNames[$evt.test.id] = $evt.test.name
                if ($evt.test.name -notmatch "loading") {
                    # Print without newline for test name, will add result later
                    Write-Host "🧪 $($evt.test.name) ... " -NoNewline
                }
            }

            if ($evt.type -eq "error") {
                $name = if ($testNames.ContainsKey($evt.testID)) { $testNames[$evt.testID] } else { "Unknown Test" }
                Write-Host "❌ ERROR" -ForegroundColor Red
                $fileReasons += "    ❌ [$name]: $($evt.error)"
            }

            if ($evt.type -eq "testDone") {
                if ($evt.testID -eq 0) { return }
                if ($evt.result -eq "success") { 
                    $filePassed++ 
                    Write-Host "✅" -ForegroundColor Green
                }
                elseif ($evt.result -eq "failure") { 
                    $fileFailed++ 
                    Write-Host "❌" -ForegroundColor Red
                }
                elseif ($evt.result -eq "error") { 
                    $fileErrors++ 
                    Write-Host "⚠️" -ForegroundColor Magenta
                }
                $foundResults = $true
            }
        } catch { }
    }
}

Write-Host "`n========================================" -ForegroundColor White
Write-Host "🏁 FINAL MOBILE UNIT SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor White
Write-Host "✅ TOTAL PASSED:   $filePassed" -ForegroundColor Green
Write-Host "❌ TOTAL FAILED:   $fileFailed" -ForegroundColor Red
Write-Host "⚠️ TOTAL ERRORS:   $fileErrors" -ForegroundColor Magenta
Write-Host "🔍 WARNINGS:       $(if ($hasWarning) { 1 } else { 0 })" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor White

foreach ($reason in $fileReasons) { Write-Host $reason -ForegroundColor Gray }

Pop-Location

if ($fileFailed -eq 0 -and $fileErrors -eq 0 -and $foundResults) {
    Write-Host "🏆 100% SUCCESS" -ForegroundColor Green
    exit 0
} else {
    Write-Host "💀 SOME TESTS FAILED" -ForegroundColor Red
    exit 1
}
