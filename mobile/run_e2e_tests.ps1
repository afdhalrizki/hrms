# Run Flutter E2E tests with detailed reporting
Write-Host "`n🚀 Running Mobile End-to-End Tests (Detailed Reporting)..." -ForegroundColor Cyan

function Wait-ForPort {
    param(
        [string]$HostName = '127.0.0.1',
        [int]$Port,
        [int]$TimeoutSeconds = 120,
        [int]$IntervalSeconds = 2
    )

    $waited = 0
    while ($waited -lt $TimeoutSeconds) {
        if (Test-NetConnection -ComputerName $HostName -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue) {
            return $true
        }
        Start-Sleep -Seconds $IntervalSeconds
        $waited += $IntervalSeconds
    }
    return $false
}

function Test-BackendHealth {
    try {
        $health = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return $true
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 404) {
            return $true
        }
        return $false
    }
}

# Ensure we are in the mobile directory
Push-Location $PSScriptRoot

function Ensure-BackendStarted {
    param(
        [int]$StartTimeoutSeconds = 180
    )

    $root = Split-Path -Parent -Path $PSScriptRoot
    $upScript = Join-Path $root "up.ps1"

    # If backend port already available and health passes, we are good.
    if ((Wait-ForPort -HostName '127.0.0.1' -Port 8000 -TimeoutSeconds 10 -IntervalSeconds 2) -and (Test-BackendHealth)) {
        Write-Host "Backend already available." -ForegroundColor Green
        return $true
    }

    if (-not (Test-Path $upScript)) {
        Write-Host "up.ps1 not found at $upScript. Cannot auto-start backend." -ForegroundColor Yellow
        return $false
    }

    Write-Host "[Pre-check] Starting backend with up.ps1 dev ..." -ForegroundColor Yellow
    Push-Location $root
    .\up.ps1 dev
    Pop-Location

    Write-Host "Waiting for backend port 8000 (max $StartTimeoutSeconds s)..." -ForegroundColor Gray
    if (-not (Wait-ForPort -HostName '127.0.0.1' -Port 8000 -TimeoutSeconds $StartTimeoutSeconds -IntervalSeconds 2)) {
        Write-Host "ERROR: Timeout waiting for backend port 8000" -ForegroundColor Red
        return $false
    }

    Write-Host "Performing backend API health check..." -ForegroundColor Gray
    if (-not (Test-BackendHealth)) {
        Write-Host "ERROR: Backend health endpoint not healthy." -ForegroundColor Red
        return $false
    }

    Start-Sleep -Seconds 5
    return $true
}

# Check backend service before e2e run
Write-Host "[Pre-check] Ensuring backend is reachable on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
if (-not (Ensure-BackendStarted -StartTimeoutSeconds 180)) {
    Write-Host "ERROR: Backend is not ready after startup attempts." -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "📦 Generating localizations..." -ForegroundColor Gray
& flutter gen-l10n 2>$null

# Ensuring log directory exists
$LogDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("e2e_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

# Hybrid VM mode is the most reliable for real-backend integration in this environment.
$file = "test/e2e_test.dart"
Write-Host "[RUNNING] $file" -ForegroundColor Yellow
Write-Host "Logging output to: $LogFile" -ForegroundColor Gray

$rawOutput = & flutter test --reporter json $file 2>&1 | Tee-Object -FilePath $LogFile

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
