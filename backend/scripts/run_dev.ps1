# HRMS Backend Local Development Script (PowerShell)
# This script automates Docker services, environment setup, and Django server execution.

param(
    [switch]$NoDeps,
    [switch]$ForceDeps,
    [switch]$NoServer,
    [switch]$Seed,
    [switch]$Coverage,
    [switch]$SkipDocker,
    [switch]$Force           # Force restart on port 8000
)

$ErrorActionPreference = "Stop"

# 1. Setup Paths
$BackendDir = Split-Path -Parent $PSScriptRoot
$RootDir = Split-Path -Parent $BackendDir
$EnvFile = Join-Path $RootDir "deploy\environments\.env.local"
$VenvDir = Join-Path $BackendDir "venv"
$PythonExec = if ($IsWindows) { Join-Path $VenvDir "Scripts\python.exe" } else { Join-Path $VenvDir "bin/python" }
$ReqHashPath = Join-Path $BackendDir ".venv_requirements.hash"

# 2. Docker Command Detection
$dockerCmd = "docker compose"
if (docker compose version 2>$null) { $dockerCmd = "docker compose" }
elseif (Get-Command "docker-compose" -ErrorAction SilentlyContinue) { $dockerCmd = "docker-compose" }
else { $dockerCmd = $null }

if (-not $dockerCmd) {
    Write-Host "❌ ERROR: Neither docker compose nor docker-compose found." -ForegroundColor Red
    exit 1
}

Write-Host "--- HRMS Backend Local Dev Setup ---" -ForegroundColor Cyan

# 3. Check for .env.local
if (-not (Test-Path $EnvFile)) {
    Write-Host "⚠️ WARNING: Environment file not found at $EnvFile" -ForegroundColor Yellow
    if (-not $env:DB_PASSWORD) {
        Write-Host "❌ ERROR: Required environment variables (e.g. DB_PASSWORD) are not set and .env.local is missing." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Loading environment variables from .env.local..." -ForegroundColor Gray
    $content = Get-Content $EnvFile
    foreach ($line in $content) {
        if ($line -match "^([^#=]+)=(.*)$") {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
        }
    }
}

# 4. Handle Docker Services
if ($SkipDocker) {
    Write-Host "[1/5] Skipping Docker setup (-SkipDocker detected)." -ForegroundColor Yellow
} else {
    Write-Host "[1/5] Ensuring Docker services are running..." -ForegroundColor Yellow
    
    # Defensive Port Checks
    $RequiredPorts = @(5433, 6379, 6432, 8000)
    foreach ($Port in $RequiredPorts) {
        if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
            Write-Host "WARNING: Port $Port is already in use. This might cause Docker or Local Server to fail." -ForegroundColor Yellow
        }
    }

    # Check if Docker is running
    docker info >$null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Docker daemon is not running. Please start Docker manually." -ForegroundColor Red
        exit 1
    }

    & $dockerCmd --env-file $EnvFile up -d db redis pgbouncer
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Failed to start Docker services." -ForegroundColor Red
        exit 1
    }
}

# 5. Overrides for Local Execution
$env:DB_HOST = "localhost"
$env:REDIS_URL = "redis://localhost:6379/1"
$env:DATABASE_URL = "postgres://hrms_user:hrms_password@localhost:6432/hrms"

# Wait for DB to be ready
Write-Host "Waiting for database to be ready on localhost:6432..." -ForegroundColor Gray
$dbReady = $false
for ($i=0; $i -lt 20; $i++) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $waitTask = $client.BeginConnect("127.0.0.1", 6432, $null, $null)
        if ($waitTask.AsyncWaitHandle.WaitOne(500, $false)) {
            $client.EndConnect($waitTask)
            $dbReady = $true
            $client.Close()
            break
        }
        $client.Close()
    } catch { }
    Start-Sleep -Seconds 2
    Write-Host "." -NoNewline -ForegroundColor Gray
}

if (-not $dbReady) {
    Write-Host "`n❌ ERROR: Database did not become ready in time." -ForegroundColor Red
    exit 1
}
Write-Host "Database is ready!" -ForegroundColor Green

# 6. Virtual Environment Check
Write-Host "[3/5] Checking virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $VenvDir)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Gray
    python -m venv venv
}

# 7. Sync Dependencies
Write-Host "[4/5] Syncing dependencies..." -ForegroundColor Yellow
if (-not $NoDeps) {
    $reqFile = Join-Path $BackendDir "requirements.txt"
    $reqHash = (Get-FileHash -Path $reqFile -Algorithm SHA256).Hash
    $cachedHash = if (Test-Path $ReqHashPath) { Get-Content $ReqHashPath -Raw } else { "" }

    if ($ForceDeps -or $reqHash -ne $cachedHash) {
        Write-Host "Installing requirements (changes detected)..." -ForegroundColor Gray
        & $PythonExec -m pip install --upgrade pip setuptools wheel
        & $PythonExec -m pip install -r $reqFile
        $reqHash | Out-File -FilePath $ReqHashPath -Encoding ascii
    } else {
        Write-Host "Requirements are unchanged; skip pip install." -ForegroundColor Green
    }
}

# 8. Migrations
Write-Host "[5/5] Checking migrations (shared & tenant)..." -ForegroundColor Yellow
try {
    & $PythonExec manage.py migrate_schemas --shared --noinput
    & $PythonExec manage.py migrate_schemas --tenant --noinput
} catch {
    Write-Host "Migration failed. You might need to run 'python manage.py bootstrap_tenants' if this is first run." -ForegroundColor Red
}

if ($Seed) {
    Write-Host "[5+/5] Seeding test data..." -ForegroundColor Yellow
    $seedScript = Join-Path $BackendDir "scripts\seed_test_db.py"
    if (Test-Path $seedScript) {
        & $PythonExec $seedScript
    } else {
        Write-Host "WARNING: scripts/seed_test_db.py not found. Skipping seed." -ForegroundColor Yellow
    }
}

# 9. Start Server
if (-not $NoServer) {
    $portOccupied = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
    $shouldStart = $true

    if ($portOccupied) {
        Write-Host "Port 8000 is already in use. Checking health..." -ForegroundColor Yellow
        $isHealthy = $false
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:8000/api/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($resp.StatusCode -lt 500) { $isHealthy = $true }
        } catch { }

        if ($isHealthy -and -not $Force) {
            Write-Host "Existing backend service is healthy. Skipping local runserver." -ForegroundColor Green
            $shouldStart = $false
        } else {
            Write-Host "Existing process on port 8000 is unhealthy or -Force detected. Terminating..." -ForegroundColor Red
            Stop-Process -Id $portOccupied[0].OwningProcess -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            $shouldStart = $true
        }
    }

    if ($shouldStart) {
        Write-Host "--- Starting Django Server at http://localhost:8000 ---" -ForegroundColor Green
        if ($Coverage) {
            Write-Host "Running WITH coverage collection..." -ForegroundColor Magenta
            & $PythonExec -m coverage run manage.py runserver 0.0.0.0:8000 --noreload
        } else {
            & $PythonExec manage.py runserver 0.0.0.0:8000
        }
    }
} else {
    Write-Host "Skipping runserver due to -NoServer." -ForegroundColor Yellow
}

exit $LASTEXITCODE
