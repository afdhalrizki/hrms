# Mobile End-to-End Test Runner (PowerShell)
# Orchestrates Flutter E2E tests with optional backend integration.

param(
    [switch]$Integrated
)

$ErrorActionPreference = "Stop"

$MobileDir = Split-Path -Parent $PSScriptRoot
$RootDir = Split-Path -Parent $MobileDir
$BackendDir = Join-Path $RootDir "backend"

Push-Location $MobileDir

Write-Host "--- HRMS Mobile E2E Test Suite ---" -ForegroundColor Cyan
if ($Integrated) { Write-Host "🔗 INTEGRATED MODE: Using real backend and database." -ForegroundColor Yellow }

# Ensuring log directory exists
$LogDir = Join-Path $MobileDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$LogFile = Join-Path $LogDir ("e2e_test_$timestamp.log")

function Test-BackendHealth {
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { return $true }
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq 404) { return $true }
    }
    return $false
}

function Wait-ForPort {
    param([int]$Port, [int]$TimeoutSeconds = 120)
    $waited = 0
    while ($waited -lt $TimeoutSeconds) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $waitTask = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
            if ($waitTask.AsyncWaitHandle.WaitOne(500, $false)) {
                $client.EndConnect($waitTask)
                $client.Close()
                return $true
            }
            $client.Close()
        } catch { }
        Start-Sleep -Seconds 2
        $waited += 2
    }
    return $false
}

function Ensure-BackendStarted {
    Write-Host "[Pre-check] Ensuring backend reachable on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
    
    if (Wait-ForPort -Port 8000 -TimeoutSeconds 5) {
        if (Test-BackendHealth) {
            Write-Host "✅ Backend is already available and healthy." -ForegroundColor Green
        } else {
            Write-Host "⚠️ Port 8000 in use but backend unhealthy." -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "🚀 Backend not ready. Starting via run_dev.ps1..." -ForegroundColor Yellow
        Start-Process -FilePath "pwsh" -ArgumentList "-NoProfile", "-NoLogo", "-Command", "cd '$BackendDir'; ./scripts/run_dev.ps1 -NoDeps" -WindowStyle Hidden
        
        Write-Host "Waiting for backend port 8000 (max 180s)..." -ForegroundColor Gray
        if (-not (Wait-ForPort -Port 8000 -TimeoutSeconds 180)) {
            Write-Host "❌ ERROR: Timeout waiting for backend port 8000" -ForegroundColor Red
            return $false
        }
    }

    if ($Integrated) {
        Write-Host "🔗 Integrated mode: Bootstrapping and seeding..." -ForegroundColor Yellow
        Push-Location $BackendDir
        
        # Env Overrides
        $env:DB_HOST = "127.0.0.1"; $env:DB_PORT = "6432"
        $env:DB_USER = "hrms_user"; $env:DB_PASSWORD = "hrms_password"
        $env:DATABASE_URL = "postgres://hrms_user:hrms_password@127.0.0.1:6432/hrms"
        
        Write-Host "🔗 Running bootstrap_tenants..." -ForegroundColor Gray
        & ./venv/Scripts/python.exe manage.py bootstrap_tenants > $null 2>&1
        Write-Host "🔗 Running seed_test_db.py..." -ForegroundColor Gray
        & ./venv/Scripts/python.exe scripts/seed_test_db.py > $null 2>&1
        Pop-Location

        # Smoke test
        Write-Host "💨 Running pre-flight smoke test..." -ForegroundColor Yellow
        try {
            $headers = @{ "X-Tenant-Domain" = "company1.localhost"; "Host" = "company1.localhost:8000"; "Content-Type" = "application/json" }
            $body = @{ "email" = "admin@company1.com"; "password" = "password123" } | ConvertTo-Json
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/auth/login/" -Method Post -Headers $headers -Body $body -UseBasicParsing
            if ($resp.StatusCode -eq 200) { Write-Host "✅ Smoke test passed." -ForegroundColor Green }
            else { Write-Host "⚠️ Smoke test failed (Status: $($resp.StatusCode))" -ForegroundColor Red }
        } catch {
            Write-Host "⚠️ Smoke test error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    return $true
}

if (-not (Ensure-BackendStarted)) {
    Pop-Location
    exit 1
}

Write-Host "📦 Generating localizations..." -ForegroundColor Gray
& flutter gen-l10n 2>$null

$testFile = "test/e2e_test.dart"
Write-Host "[RUNNING] $testFile" -ForegroundColor Yellow
Write-Host "Logging output to: $LogFile" -ForegroundColor Gray

$dartDefines = if ($Integrated) { "--dart-define=INTEGRATED_TEST=true" } else { "" }

$filePassed = 0; $fileFailed = 0; $fileErrors = 0; $hasWarning = $false
$testNames = @{}; $fileReasons = @()

# Use ForEach-Object to parse JSON output line by line
& flutter test --reporter json $dartDefines $testFile 2>&1 | Tee-Object -FilePath $LogFile | ForEach-Object {
    $line = $_.ToString().Trim()
    if ($line -match "(?i)warning") { $hasWarning = $true }

    if ($line.StartsWith("{") -and $line.EndsWith("}")) {
        try {
            $evt = $line | ConvertFrom-Json
            if ($evt.type -eq "testStart" -and $evt.test.name) {
                $testNames[$evt.test.id] = $evt.test.name
                if ($evt.test.name -notmatch "loading") { Write-Host "`n🏃 Testing: $($evt.test.name)" -ForegroundColor Cyan }
            }
            if ($evt.type -eq "print") {
                if ($evt.message -match "(?i)(TEST:|DEBUG MOBILE:|HTTP REQUEST|LOGIN:)") { Write-Host "   $($evt.message)" -ForegroundColor Gray }
            }
            if ($evt.type -eq "error") {
                $name = if ($testNames.ContainsKey($evt.testID)) { $testNames[$evt.testID] } else { "Unknown" }
                Write-Host "   ❌ ERROR: $($evt.error)" -ForegroundColor Red
                $fileReasons += "    ❌ [$name]: $($evt.error)"
            }
            if ($evt.type -eq "testDone") {
                if ($evt.testID -eq 0) { return }
                if ($evt.result -eq "success") { $filePassed++; Write-Host "   ✅ PASSED" -ForegroundColor Green }
                elseif ($evt.result -eq "failure") { $fileFailed++; Write-Host "   ❌ FAILED" -ForegroundColor Red }
                elseif ($evt.result -eq "error") { $fileErrors++; Write-Host "   ⚠️ ERROR" -ForegroundColor Magenta }
            }
        } catch {}
    }
}

Write-Host "`n========================================" -ForegroundColor White
Write-Host "🏁 E2E TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor White
Write-Host "✅ TOTAL PASSED:   $filePassed" -ForegroundColor Green
Write-Host "❌ TOTAL FAILED:   $fileFailed" -ForegroundColor Red
Write-Host "⚠️ TOTAL ERRORS:   $fileErrors" -ForegroundColor Magenta
Write-Host "🔍 TOTAL WARNINGS: $(if ($hasWarning) {1} else {0})" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor White

if ($fileFailed -gt 0 -or $fileErrors -gt 0) { $fileReasons | ForEach-Object { Write-Host $_ -ForegroundColor Gray } }

Pop-Location
if ($fileFailed -eq 0 -and $fileErrors -eq 0) {
    Write-Host "🏆 E2E SUCCESS" -ForegroundColor Green
    exit 0
} else {
    Write-Host "💀 E2E TEST FAILED" -ForegroundColor Red
    exit 1
}
