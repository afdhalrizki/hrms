# HRMS Backend Local Development Script (PowerShell)
# This script automates Docker services, environment setup, and Django server execution.

param(
    [switch]$NoDeps,
    [switch]$ForceDeps,
    [switch]$NoServer
)

$ErrorActionPreference = "Stop"

# 1. Setup Paths
$BackendDir = $PSScriptRoot
Push-Location $BackendDir
$RootDir = Split-Path -Parent $BackendDir
$EnvFile = Join-Path $RootDir "environments\.env.local"
$VenvDir = Join-Path $BackendDir "venv"
$PythonExec = Join-Path $VenvDir "Scripts\python.exe"
$ReqHashPath = Join-Path $BackendDir ".venv_requirements.hash"

Write-Host "--- HRMS Backend Local Dev Setup ---" -ForegroundColor Cyan

# 2. Check for .env.local
if (-not (Test-Path $EnvFile)) {
    Write-Error "Could not find environment file at $EnvFile. Please ensure it exists."
}

# 3. Handle Docker Services (DB, Redis, PgBouncer)
Write-Host "[1/5] Ensuring Docker services (db, redis, pgbouncer) are running..." -ForegroundColor Yellow

# Defensive Port Checks
$RequiredPorts = @(5432, 6379, 6432, 8000)
foreach ($Port in $RequiredPorts) {
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
        $Process = Get-Process -Id (Get-NetTCPConnection -LocalPort $Port -State Listen).OwningProcess
        Write-Host "WARNING: Port $Port is already in use by process: $($Process.Name) (PID: $($Process.Id))" -ForegroundColor Yellow
        Write-Host "This might cause Docker to fail to bind ports." -ForegroundColor Gray
    }
}

# Check if Docker is running
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Docker daemon is not running. Attempting to start Docker Desktop..." -ForegroundColor Yellow
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process -FilePath $dockerPath
        $maxWaitDocker = 24 # ~2 minutes
        $waitedDo = 0
        while ($waitedDo -lt $maxWaitDocker) {
            Start-Sleep -Seconds 5
            docker info >$null 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Docker daemon is now running!" -ForegroundColor Green
                break
            }
            Write-Host "." -NoNewline -ForegroundColor Gray
            $waitedDo++
        }
        if ($waitedDo -eq $maxWaitDocker -and $LASTEXITCODE -ne 0) {
            Write-Host "❌ ERROR: Docker did not start in time. Please start Docker Desktop manually." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ ERROR: Docker Desktop not found at $dockerPath. Please start it manually!" -ForegroundColor Red
        exit 1
    }
}

try {
    # We use docker-compose from the root directory
    Push-Location $RootDir
    # Support both 'docker-compose' and 'docker compose'
    $dockerCmd = "docker-compose"
    if (-not (Get-Command $dockerCmd -ErrorAction SilentlyContinue)) {
        $dockerCmd = "docker compose"
    }
    
    Write-Host "Using: $dockerCmd" -ForegroundColor Gray
    & $dockerCmd --env-file $EnvFile up -d db redis pgbouncer
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to start Docker services via $dockerCmd." -ForegroundColor Red
        exit 1
    }
    Pop-Location
} catch {
    Write-Host "Failed to start Docker services. Error: $_" -ForegroundColor Red
    exit 1
}


# 4. Sourcing Environment Variables & Overriding for Local
Write-Host "[2/5] Loading environment variables..." -ForegroundColor Yellow
$content = Get-Content $EnvFile
foreach ($line in $content) {
    if ($line -match "^([^#=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
}

# Override container-local hosts to localhost for native execution
$env:DB_HOST = "localhost"
$env:REDIS_URL = "redis://localhost:6379/1"
$env:DATABASE_URL = "postgres://hrms_user:hrms_password@localhost:6432/hrms"

# Wait for DB to be ready
Write-Host "Waiting for database to be ready on localhost:5432..." -ForegroundColor Gray
$maxTries = 20
$tryCount = 0
while ($tryCount -lt $maxTries) {
    $test = Test-NetConnection -ComputerName "localhost" -Port 5432 -InformationLevel Quiet
    if ($test) {
        Write-Host "Database is ready!" -ForegroundColor Green
        break
    }
    $tryCount++
    Start-Sleep -Seconds 2
    Write-Host "." -NoNewline -ForegroundColor Gray
}

if ($tryCount -eq $maxTries) {
    Write-Host "`nERROR: Database did not become ready in time." -ForegroundColor Red
    exit 1
}

# 5. Virtual Environment Check

Write-Host "[3/5] Checking virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $VenvDir)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Gray
    python -m venv venv
}

# 6. Install/Update Requirements
Write-Host "[4/5] Syncing dependencies..." -ForegroundColor Yellow
if (-not $NoDeps) {
    $reqHash = (Get-FileHash -Path requirements.txt -Algorithm SHA256).Hash
    $cachedHash = if (Test-Path $ReqHashPath) { Get-Content $ReqHashPath -Raw } else { "" }

    if ($ForceDeps -or $reqHash -ne $cachedHash) {
        Write-Host "Installing requirements (changes detected or forced build)..." -ForegroundColor Gray
        & $PythonExec -m pip install --upgrade pip setuptools wheel | Out-Null
        & $PythonExec -m pip install -r requirements.txt | Out-Null
        $reqHash | Out-File -FilePath $ReqHashPath -Encoding ascii
    } else {
        Write-Host "Requirements are unchanged; skip pip install." -ForegroundColor Green
    }
} else {
    Write-Host "Skipping dependency sync due to --NoDeps." -ForegroundColor Yellow
}

# 7. Database Migrations
Write-Host "[5/5] Checking migrations (shared & tenant)..." -ForegroundColor Yellow
try {
    & $PythonExec manage.py migrate_schemas --shared --noinput
    & $PythonExec manage.py migrate_schemas --tenant --noinput
} catch {
    Write-Host "Migration failed. You might need to run 'python manage.py bootstrap_tenants' if this is first run." -ForegroundColor Red
}

if (-not $NoServer) {
    # 8. Start Server
    if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) {
        Write-Host "Port 8000 is already in use; assuming existing backend service is running. Skipping local runserver." -ForegroundColor Yellow
    } else {
        Write-Host "--- Starting Django Server at http://localhost:8000 ---" -ForegroundColor Green
        & $PythonExec manage.py runserver 0.0.0.0:8000
    }
} else {
    Write-Host "Skipping runserver due to --NoServer." -ForegroundColor Yellow
}

Pop-Location
