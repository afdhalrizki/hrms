# Playwright E2E Master Script (PowerShell)
# Usage: .\run_e2e_tests.ps1 [-Live] [-SkipInstall] [-SkipSeed]

param (
    [switch]$Live,         # Run against real backend (requires Docker)
    [switch]$SkipInstall,  # Skip npm install check
    [switch]$SkipSeed      # Skip database seeding
)

$ErrorActionPreference = "Stop"

$InternalScriptDir = $PSScriptRoot
$FrontendDir = Split-Path -Parent -Path $InternalScriptDir
$RootDir = Split-Path -Parent -Path $FrontendDir
$BackendDir = Join-Path $RootDir "backend"

Push-Location $FrontendDir

Write-Host "--- HRMS Playwright Automation ---" -ForegroundColor Cyan

# Ensuring log directory exists
$LogDir = Join-Path $FrontendDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("e2e_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

# 1. Dependency Check
if (-not $SkipInstall) {
    Write-Host "[1/3] Checking Frontend Dependencies..." -ForegroundColor Yellow
    npm install
    npx playwright install chromium
}

Write-Host "Logging output to: $LogFile" -ForegroundColor Gray

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

# 2. Environment Setup
if ($Live) {
    Write-Host "[2/3] Setting up Live Backend Environment..." -ForegroundColor Yellow
    
    $UpScript = Join-Path $RootDir "up.ps1"
    if (Test-Path $UpScript) {
        Write-Host "Ensuring backend is up..." -ForegroundColor Gray
        Push-Location $RootDir
        & .\up.ps1 dev
        Pop-Location

        Write-Host "Waiting for backend port 8000 (max 180s)..." -ForegroundColor Gray
        if (-not (Wait-ForPort -Port 8000 -TimeoutSeconds 180)) {
            Write-Host "ERROR: Backend port 8000 did not become available." -ForegroundColor Red
            exit 1
        }

        if (-not (Test-BackendHealth)) {
            Write-Host "ERROR: Backend health check failed after startup." -ForegroundColor Red
            exit 1
        }
        Start-Sleep -Seconds 5
    } else {
        Write-Host "Warning: up.ps1 not found, continuing with existing backend state..." -ForegroundColor Yellow
    }
}

if (-not $SkipSeed) {
    Write-Host "[2/3] Preparing/Seeding test data (Backend)..." -ForegroundColor Yellow
    
    $PythonCmd = "python"
    $VenvPath = Join-Path $BackendDir "venv\Scripts\python.exe"
    if (Test-Path $VenvPath) {
        $PythonCmd = $VenvPath
        Write-Host "Using Virtual Environment: $VenvPath" -ForegroundColor Gray
    }

    $seedScript = Join-Path $BackendDir "scripts\seed_test_db.py"
    if (Test-Path $seedScript) {
        & $PythonCmd $seedScript
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Seed successful." -ForegroundColor Green
        } else {
            Write-Host "Warning: Seed script failed (Exit Code: $LASTEXITCODE)." -ForegroundColor Gray
        }
    } else {
        Write-Host "Warning: Seed script not found at $seedScript" -ForegroundColor Yellow
    }
}

# 3. Port Cleanup
Write-Host "[3/4] Ensuring ports (3000, 8000) are available..." -ForegroundColor Yellow
$Ports = @(3000, 8000)
foreach ($Port in $Ports) {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        if ($conn.OwningProcess) {
            Write-Host "Cleaning up process $($conn.OwningProcess) on port $Port..." -ForegroundColor Gray
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

# 3.5. Build Frontend
Write-Host "[3.5/4] Building Frontend Production Bundle..." -ForegroundColor Yellow
$env:NEXT_DISABLE_SWC = "1"
$env:NEXT_PRIVATE_LOCAL_SKIP_SWC_CHECK = "1"

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Frontend build failed. Aborting tests." -ForegroundColor Red
    exit 1
}

# 4. Execution
Write-Host "[4/4] Launching Playwright Tests..." -ForegroundColor Cyan
$env:PORT = "3000"
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = "logs/e2e_results.json"
$env:NEXT_PUBLIC_API_URL = if ($Live) { "https://qa.harikerja.web.id/api" } else { "http://localhost:8000/api" }

$playwrightCmd = "npx playwright test --grep-invert 'diagnostic|Instrumentation' --workers=1 --retries=2 --timeout=120000 --reporter=list,json"
& npx playwright test --grep-invert 'diagnostic|Instrumentation' --workers=1 --retries=2 --timeout=120000 --reporter=list,json 2>&1 | Tee-Object -FilePath $LogFile
$ExitCode = $LASTEXITCODE

# Extra retry
if ($ExitCode -ne 0) {
    Write-Host "Transient failure detected, retrying Playwright suite once more..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    & npx playwright test --grep-invert 'diagnostic|Instrumentation' --workers=1 --retries=2 --timeout=120000 --reporter=list,json
    $ExitCode = $LASTEXITCODE
}

# Move screenshots
$pngFiles = Get-ChildItem -Path $FrontendDir -Filter "*-failure.png" -File -ErrorAction SilentlyContinue
if ($pngFiles) {
    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
    $pngFiles | Move-Item -Destination $LogDir -Force
    Write-Host "📸 Moved $($pngFiles.Count) failure screenshots to $LogDir" -ForegroundColor DarkYellow
}

if ($ExitCode -eq 0) {
    Write-Host "`nWINNER! All tests passed." -ForegroundColor Green
} else {
    Write-Host "`nFAILURE. Some tests failed. Check the Playwright report." -ForegroundColor Red
}

Pop-Location
exit $ExitCode
