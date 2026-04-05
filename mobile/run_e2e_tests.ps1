param(
    [switch]$Integrated
)

# Run Flutter E2E tests with detailed reporting
Write-Host "`n🚀 Running Mobile End-to-End Tests (Detailed Reporting)..." -ForegroundColor Cyan
if ($Integrated) { Write-Host "🔗 INTEGRATED MODE: Using real backend and database." -ForegroundColor Yellow }

Push-Location $PSScriptRoot

function Wait-ForPort {
    param(
        [string]$HostName,
        [int]$Port,
        [int]$TimeoutSeconds = 30,
        [int]$IntervalSeconds = 1
    )

    $waited = 0
    while ($waited -lt $TimeoutSeconds) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $wait = $client.BeginConnect($HostName, $Port, $null, $null)
            if ($wait.AsyncWaitHandle.WaitOne(500, $false)) {
                $client.EndConnect($wait)
                $client.Close()
                return $true
            }
            $client.Close()
        } catch { }
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

# Ensuring log directory exists
$LogDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("e2e_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

function Ensure-BackendStarted {
    param(
        [int]$StartTimeoutSeconds = 180
    )

    $root = Split-Path -Parent -Path $PSScriptRoot
    
    # Check if backend is already healthy
    if ((Wait-ForPort -HostName '127.0.0.1' -Port 8000 -TimeoutSeconds 5) -and (Test-BackendHealth)) {
        Write-Host "✅ Backend is already available and healthy." -ForegroundColor Green
    } else {
        Write-Host "🚀 Backend not ready. Starting via run_dev.ps1..." -ForegroundColor Yellow
        # Start backend in a NEW background process so it persists
        $backendDir = Join-Path $root "backend"
        Start-Process -FilePath "pwsh" -ArgumentList "-NoProfile", "-NoLogo", "-Command", "cd '$backendDir'; ./run_dev.ps1 -NoDeps" -WindowStyle Hidden
        
        Write-Host "Waiting for backend port 8000 (max $StartTimeoutSeconds s)..." -ForegroundColor Gray
        if (-not (Wait-ForPort -HostName '127.0.0.1' -Port 8000 -TimeoutSeconds $StartTimeoutSeconds -IntervalSeconds 5)) {
            Write-Host "ERROR: Timeout waiting for backend port 8000" -ForegroundColor Red
            return $false
        }
    }

    if ($Integrated) {
        Write-Host "🔗 Integrated mode: Bootstrapping tenants and seeding demo data..." -ForegroundColor Yellow
        Push-Location (Join-Path $root "backend")
        
        # Set environment for the current process so the next commands work
        $env:DB_HOST = "127.0.0.1" 
        $env:DB_PORT = "6432"
        $env:DB_USER = "hrms_user"
        $env:DB_PASSWORD = "hrms_password"
        $env:DB_NAME = "hrms"
        $env:REDIS_URL = "redis://localhost:6379/1"
        $env:DATABASE_URL = "postgres://hrms_user:hrms_password@127.0.0.1:6432/hrms"
        
        $SetupLog = Join-Path $LogDir "integrated_setup.log"
        Write-Host "🔗 Running bootstrap_tenants (Logging to $SetupLog)..." -ForegroundColor Gray
        & ./venv/Scripts/python.exe manage.py bootstrap_tenants > $SetupLog 2>&1
        Write-Host "🔗 Running seed_test_db.py (Logging to $SetupLog)..." -ForegroundColor Gray
        & ./venv/Scripts/python.exe scripts/seed_test_db.py >> $SetupLog 2>&1
        Pop-Location


        # Pre-flight smoke test
        Write-Host "💨 Running pre-flight smoke test (Login check)..." -ForegroundColor Yellow
        try {
            $headers = @{ 
                "X-Tenant-Domain" = "company1.localhost"
                "Host" = "company1.localhost:8000"
                "Content-Type" = "application/json"
            }
            $body = @{ "email" = "admin@company1.com"; "password" = "password123" } | ConvertTo-Json
            $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/auth/login/" -Method Post -Headers $headers -Body $body -TimeoutSec 30 -UseBasicParsing

            if ($resp.StatusCode -eq 200) {
                Write-Host "✅ Smoke test passed: Backend is reachable and login works." -ForegroundColor Green
            } else {
                Write-Host "⚠️ Smoke test failed with status: $($resp.StatusCode)" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Smoke test ERROR: $($_.Exception.Message)" -ForegroundColor Red
            if ($_.Exception.Response) {
                $errBody = [System.Text.Encoding]::UTF8.GetString($_.Exception.Response.GetResponseStream().ToArray())
                Write-Host "   Response Body: $errBody" -ForegroundColor Gray
            }
        }
    }



    return (Test-BackendHealth)
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

# Hybrid VM mode is the most reliable for real-backend integration in this environment.
$file = "test/e2e_test.dart"
Write-Host "[RUNNING] $file" -ForegroundColor Yellow
Write-Host "Logging output to: $LogFile" -ForegroundColor Gray

$dartDefines = if ($Integrated) { "--dart-define=INTEGRATED_TEST=true" } else { "" }
$rawOutput = & flutter test --reporter json $dartDefines $file 2>&1 | Tee-Object -FilePath $LogFile

$filePassed = 0
$fileFailed = 0
$fileErrors = 0
$fileReasons = @()
$hasWarning = $false
$foundResults = $false
$testNames = @{}

& flutter test --reporter json $dartDefines $file 2>&1 | Tee-Object -FilePath $LogFile | ForEach-Object {
    $lineStr = $_.ToString().Trim()
    
    # Detect Warnings
    if ($lineStr -match "(?i)warning") { 
        $hasWarning = $true; 
        if ($lineStr -notmatch '^{.*}$') { $fileReasons += "    ⚠️ $lineStr" }
    }

    # Parse JSON events
    if ($lineStr.StartsWith("{") -and $lineStr.EndsWith("}")) {
        try {
            $evt = $lineStr | ConvertFrom-Json -ErrorAction SilentlyContinue
            if (!$evt) { return }

            if ($evt.type -eq "testStart" -and $evt.test.name) {
                $testNames[$evt.test.id] = $evt.test.name
                if ($evt.test.name -notmatch "loading") {
                    Write-Host "`n🏃 Testing: $($evt.test.name)" -ForegroundColor Cyan
                }
            }

            if ($evt.type -eq "print") {
                if ($evt.message -match "(?i)(TEST:|DEBUG MOBILE:|HTTP REQUEST|LOGIN:)") {
                    Write-Host "   $($evt.message)" -ForegroundColor Gray
                }
            }

            if ($evt.type -eq "error") {
                $name = if ($testNames.ContainsKey($evt.testID)) { $testNames[$evt.testID] } else { "Unknown Test" }
                Write-Host "   ❌ ERROR: $($evt.error)" -ForegroundColor Red
                $fileReasons += "    ❌ [$name]: $($evt.error)"
            }

            if ($evt.type -eq "testDone") {
                if ($evt.testID -eq 0) { return }
                $foundResults = $true
                if ($evt.result -eq "success") { 
                    $filePassed++ 
                    Write-Host "   ✅ PASSED" -ForegroundColor Green
                }
                elseif ($evt.result -eq "failure") { 
                    $fileFailed++ 
                    Write-Host "   ❌ FAILED" -ForegroundColor Red
                }
                elseif ($evt.result -eq "error") { 
                    $fileErrors++ 
                    Write-Host "   ⚠️ ERROR" -ForegroundColor Magenta
                }
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
