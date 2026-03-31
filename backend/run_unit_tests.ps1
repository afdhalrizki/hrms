# HRMS Backend Test Runner (PowerShell)
# This script ensures Docker services are running and then executes pytest.

param(
    [switch]$DockerOnly,
    [switch]$ResetDocker,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

function Wait-ForServiceHealth {
    param(
        [string]$ServiceName,
        [int]$TimeoutSeconds = 120,
        [int]$PollInterval = 5
    )

    $started = 0
    while ($started -lt $TimeoutSeconds) {
        $status = docker compose ps --services --filter "status=running" | Where-Object { $_ -eq $ServiceName }
        if ($status) {
            # Check if docker health info available
            $health = docker inspect --format '{{json .State.Health.Status}}' $ServiceName 2>$null
            if ($health -and $health -match '"healthy"') {
                return $true
            }
            if (-not $health) {
                # Service without healthcheck, accept running state
                return $true
            }
        }

        Start-Sleep -Seconds $PollInterval
        $started += $PollInterval
    }

    return $false
}

function Reset-DockerServices {
    Write-Host "[Docker] Reset requested: packing down and re-creating containers..." -ForegroundColor Cyan
    Push-Location $RootDir
    $dockerCmd = "docker-compose"
    if (-not (Get-Command $dockerCmd -ErrorAction SilentlyContinue)) {
        $dockerCmd = "docker compose"
    }

    & $dockerCmd --env-file $EnvFile down --remove-orphans
    $downCode = $LASTEXITCODE
    if ($downCode -ne 0) {
        Write-Host "WARNING: docker compose down returned code $downCode. Continuing to up." -ForegroundColor Yellow
    }

    & $dockerCmd --env-file $EnvFile up -d db redis pgbouncer
    $upCode = $LASTEXITCODE
    if ($upCode -ne 0) {
        Write-Host "ERROR: docker compose up failed with code $upCode" -ForegroundColor Red
        exit 1
    }

    # Wait for db and redis health
    if (-not (Wait-ForServiceHealth -ServiceName "db")) {
        Write-Host "ERROR: db service did not become healthy in time." -ForegroundColor Red
        exit 1
    }
    if (-not (Wait-ForServiceHealth -ServiceName "redis")) {
        Write-Host "ERROR: redis service did not become healthy in time." -ForegroundColor Red
        exit 1
    }

    Pop-Location
    Write-Host "[Docker] Reset complete, services healthy." -ForegroundColor Green
}

# 1. Setup Paths
$BackendDir = $PSScriptRoot
Push-Location $BackendDir
$RootDir = Split-Path -Parent $BackendDir
$EnvFile = Join-Path $RootDir "environments\.env.local"
$VenvDir = Join-Path $BackendDir "venv"
$PythonExec = Join-Path $VenvDir "Scripts\python.exe"
$PytestExec = Join-Path $VenvDir "Scripts\pytest.exe"

# Normalize DockerOnly option for both PowerShell and Unix-style flag
if ($RemainingArgs -contains '--docker-only') {
    $DockerOnly = $true
    $RemainingArgs = $RemainingArgs | Where-Object { $_ -ne '--docker-only' }
}

# Handle help request explicitly so upstream orchestrator can call this without running tests
if ($RemainingArgs -contains '--help' -or $RemainingArgs -contains '-h') {
    Write-Host "Usage: .\run_unit_tests.ps1 [-DockerOnly | --docker-only] [pytest options]" -ForegroundColor Cyan
    Write-Host "  -DockerOnly/--docker-only : Set up docker services and env, then exit before running pytest." -ForegroundColor Gray
    Write-Host "  --help, -h    : Show this message." -ForegroundColor Gray
    Pop-Location
    exit 0
}

Write-Host "--- HRMS Backend Test Environment Setup ---" -ForegroundColor Cyan

# 2. Check for .env.local
if (-not (Test-Path $EnvFile)) {
    Write-Error "Could not find environment file at $EnvFile. Please ensure it exists."
}

# 3. Handle Docker Services (DB, Redis, PgBouncer)
Write-Host "[1/3] Ensuring Docker services (db, redis, pgbouncer) are running..." -ForegroundColor Yellow

# Check if Docker is running, if not try to start it
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Docker daemon is not running. Attempting to start Docker Desktop..." -ForegroundColor Yellow
    
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "🚀 Starting Docker Desktop... Please wait." -ForegroundColor Gray
        
        $maxWait = 24 # 24 * 5 seconds = 2 minutes
        $waited = 0
        while ($waited -lt $maxWait) {
            Start-Sleep -Seconds 5
            docker info >$null 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ Docker is now running!" -ForegroundColor Green
                break
            }
            Write-Host "." -NoNewline -ForegroundColor Gray
            $waited++
        }
        
        if ($waited -eq $maxWait) {
            Write-Host "`n❌ ERROR: Docker did not start in time. Please check Docker Desktop manually." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ ERROR: Docker Desktop not found at $dockerPath. Please start it manually!" -ForegroundColor Red
        exit 1
    }
}

if ($ResetDocker) {
    Reset-DockerServices
}

try {
    Push-Location $RootDir
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
Write-Host "[2/3] Loading environment variables..." -ForegroundColor Yellow
$content = Get-Content $EnvFile
foreach ($line in $content) {
    if ($line -match "^([^#=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
}

# Override container-local hosts to localhost for native execution
$env:DB_HOST = "127.0.0.1"
$env:REDIS_URL = "redis://localhost:6379/1"
$env:DATABASE_URL = "postgres://hrms_user:hrms_password@localhost:6432/hrms"

# Wait for DB to be ready
Write-Host "Waiting for database to be ready on localhost:5432..." -ForegroundColor Gray
$maxTries = 20
$tryCount = 0
while ($tryCount -lt $maxTries) {
    $test = Test-NetConnection -ComputerName "127.0.0.1" -Port 5432 -InformationLevel Quiet
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
Write-Host "[3/3] Checking pytest in virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $PytestExec)) {
    Write-Host "pytest not found in $VenvDir. Please ensure venv is setup and dependencies are installed." -ForegroundColor Red
    Pop-Location
    exit 1
}

if ($DockerOnly) {
    Write-Host "--- Docker-only mode: environment ready, skipping pytest execution. ---" -ForegroundColor Green
    Pop-Location
    exit 0
}

# 6. Run Pytest
Write-Host "--- Running HRMS Backend Unit Tests ---" -ForegroundColor Green
Write-Host "Tip: You can pass specific test paths as arguments (e.g., .\run_unit_tests.ps1 users/)" -ForegroundColor Gray

# Ensure log directory exists
$LogDir = Join-Path $BackendDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("unit_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

try {
    # Dynamically detect terminal width for better alignment when piped
    $termWidth = if ($Host.UI.RawUI.WindowSize.Width -gt 0) { $Host.UI.RawUI.WindowSize.Width } else { 120 }
    
    # Force color output and pass detected terminal width
    # Removed -n auto (xdist) to prevent django-tenants schema creation clash
    & $PythonExec -m pytest --color=yes -o "terminal_width=$termWidth" --maxfail=1 --durations=20 @RemainingArgs | Tee-Object -FilePath $LogFile
    $exitCode = $LASTEXITCODE

    # 7. Final Summary Parsing
    $finalLines = Get-Content $LogFile -Tail 10
    $summaryLine = $finalLines | Where-Object { $_ -match "==.* (passed|failed|error|skipped|warning|xfailed|xpassed) in .*" }
    
    Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
    Write-Host "                TEST RUN SUMMARY" -ForegroundColor Cyan -NoNewline
    Write-Host " (Exit: $exitCode)" -ForegroundColor Gray
    Write-Host ("=" * 60) -ForegroundColor Gray
    
    if ($summaryLine) {
        # Clean up the summary line for display
        $cleanSummary = $summaryLine.Trim(' =')
        Write-Host " DETAILS : $cleanSummary" -ForegroundColor White
        
        # Determine Status and Color
        if ($cleanSummary -match "failed|error") {
            Write-Host " STATUS  : ❌ TESTS FAILED OR ENCOUNTERED ERRORS" -ForegroundColor Red
        } elseif ($cleanSummary -match "warning") {
            Write-Host " STATUS  : ⚠️ PASSED WITH WARNINGS" -ForegroundColor Yellow
        } elseif ($exitCode -eq 0) {
            Write-Host " STATUS  : ✅ ALL TESTS PASSED" -ForegroundColor Green
        } else {
            Write-Host " STATUS  : ❌ UNKNOWN FAILURE (Exit Code: $exitCode)" -ForegroundColor Red
        }
    } else {
        if ($exitCode -eq 0) {
            Write-Host " STATUS  : ✅ ALL TESTS PASSED" -ForegroundColor Green
        } else {
            Write-Host " STATUS  : ❌ EXECUTION FAILED" -ForegroundColor Red
        }
    }
    Write-Host ("=" * 60) -ForegroundColor Gray
} finally {
    # File is persistent in logs/ now
}

Pop-Location
exit $exitCode
