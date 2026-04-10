# Run all Flutter unit tests at once to reduce process startup overhead
Write-Host "[START] Starting Mobile Unit Test Suite (Merged) ..." -ForegroundColor Cyan

$MobileDir = Split-Path -Parent $PSScriptRoot
Push-Location $MobileDir

# Ensuring log directory exists
$LogDir = Join-Path $MobileDir "logs"
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
            $fileReasons += "    [WARN] $lineStr"
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
                    Write-Host "[TEST] $($evt.test.name) ... " -NoNewline
                }
            }

            if ($evt.type -eq "error") {
                $name = if ($testNames.ContainsKey($evt.testID)) { $testNames[$evt.testID] } else { "Unknown Test" }
                Write-Host "[ERROR] ERROR" -ForegroundColor Red
                $fileReasons += "    [ERROR] [$name]: $($evt.error)"
            }

            if ($evt.type -eq "testDone") {
                if ($evt.testID -eq 0) { return }
                if ($evt.result -eq "success") { 
                    $filePassed++ 
                    Write-Host "[OK]" -ForegroundColor Green
                }
                elseif ($evt.result -eq "failure") { 
                    $fileFailed++ 
                    Write-Host "[FAIL]" -ForegroundColor Red
                }
                elseif ($evt.result -eq "error") { 
                    $fileErrors++ 
                    Write-Host "[ERR]" -ForegroundColor Magenta
                }
                $foundResults = $true
            }
        } catch { }
    }
}

Write-Host "`n========================================" -ForegroundColor White
Write-Host "[SUMMARY] FINAL MOBILE UNIT SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor White
Write-Host "[PASS] TOTAL PASSED:   $filePassed" -ForegroundColor Green
Write-Host "[FAIL] TOTAL FAILED:   $fileFailed" -ForegroundColor Red
Write-Host "[ERR]  TOTAL ERRORS:   $fileErrors" -ForegroundColor Magenta
Write-Host "[WARN] WARNINGS:       $(if ($hasWarning) { 1 } else { 0 })" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor White

foreach ($reason in $fileReasons) { Write-Host $reason -ForegroundColor Gray }

Pop-Location

if ($fileFailed -eq 0 -and $fileErrors -eq 0 -and $foundResults) {
    Write-Host "[SUCCESS] 100% SUCCESS" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAILURE] SOME TESTS FAILED" -ForegroundColor Red
    exit 1
}
