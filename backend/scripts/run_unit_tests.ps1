# HRMS Backend Test Runner (PowerShell)
# This script ensures Docker services are running and then executes pytest.

param(
    [switch]$DockerOnly,
    [switch]$ResetDocker,
    [switch]$SkipDocker,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

# 1. Setup Paths
$BackendDir = Split-Path -Parent $PSScriptRoot
$RootDir = Split-Path -Parent $BackendDir
$EnvFile = Join-Path $RootDir "deploy\environments\.env.local"
$VenvDir = Join-Path $BackendDir "venv"
$PythonExec = if ($IsWindows) { Join-Path $VenvDir "Scripts\python.exe" } else { Join-Path $VenvDir "bin/python" }

# 2. Docker Command Detection
$dockerCmd = "docker compose"
if (docker compose version 2>$null) { $dockerCmd = "docker compose" }
elseif (Get-Command "docker-compose" -ErrorAction SilentlyContinue) { $dockerCmd = "docker-compose" }
else { $dockerCmd = $null }

if (-not $dockerCmd) {
    Write-Host "❌ ERROR: Neither docker compose nor docker-compose found." -ForegroundColor Red
    exit 1
}

function Wait-ForServiceHealth {
    param(
        [string]$ServiceName,
        [int]$TimeoutSeconds = 120,
        [int]$PollInterval = 5
    )

    $started = 0
    while ($started -lt $TimeoutSeconds) {
        $status = & $dockerCmd ps --services --filter "status=running" | Where-Object { $_ -eq $ServiceName }
        if ($status) {
            $health = docker inspect --format '{{json .State.Health.Status}}' $ServiceName 2>$null
            if ($health -and $health -match '"healthy"') {
                return $true
            }
            if (-not $health) {
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
    & $dockerCmd --env-file $EnvFile down --remove-orphans
    & $dockerCmd --env-file $EnvFile up -d db redis pgbouncer
    
    if (-not (Wait-ForServiceHealth -ServiceName "db")) {
        Write-Host "ERROR: db service did not become healthy in time." -ForegroundColor Red
        exit 1
    }
}

Write-Host "--- HRMS Backend Test Environment Setup ---" -ForegroundColor Cyan

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
    Write-Host "[1/3] Skipping Docker setup (-SkipDocker detected)." -ForegroundColor Yellow
} else {
    Write-Host "[1/3] Ensuring Docker services (db, redis, pgbouncer) are running..." -ForegroundColor Yellow
    
    # Check if Docker is running
    docker info >$null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Docker daemon is not running. Please start Docker manually." -ForegroundColor Red
        exit 1
    }

    if ($ResetDocker) { Reset-DockerServices }
    else {
        # Proactive check for port 5433 occupancy
        $rawPort = 5433
        $rawPortInUse = $false
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $waitTask = $client.BeginConnect("127.0.0.1", $rawPort, $null, $null)
            if ($waitTask.AsyncWaitHandle.WaitOne(500, $false)) { $rawPortInUse = $true; $client.Close() }
        } catch { }

        if ($rawPortInUse) {
            # Check if 6432 is ALSO in use
            $proxyInUse = $false
            try {
                $client = New-Object System.Net.Sockets.TcpClient
                $waitTask = $client.BeginConnect("127.0.0.1", 6432, $null, $null)
                if ($waitTask.AsyncWaitHandle.WaitOne(500, $false)) { $proxyInUse = $true; $client.Close() }
            } catch { }

            if (-not $proxyInUse) {
                Write-Host "⚠️ Port $rawPort is in use. Attempting to proceed with pgbouncer setup..." -ForegroundColor Yellow
            }
        }
    }

    & $dockerCmd --env-file $EnvFile up -d db redis pgbouncer
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Failed to start Docker services." -ForegroundColor Red
        exit 1
    }
}

# 5. Overrides for Local Execution
$env:DB_HOST = "127.0.0.1"
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
Write-Host "[3/3] Checking virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $PythonExec)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $VenvDir
    & $PythonExec -m pip install -r (Join-Path $BackendDir "requirements.txt")
}

if ($DockerOnly) {
    Write-Host "--- Docker-only mode: environment ready, skipping pytest execution. ---" -ForegroundColor Green
    exit 0
}

# 7. Run Pytest
Write-Host "--- Running HRMS Backend Unit Tests ---" -ForegroundColor Green
$LogDir = Join-Path $BackendDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("unit_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

$env:COLUMNS = 120
& $PythonExec -m pytest --color=yes --maxfail=1 --durations=20 @RemainingArgs | Tee-Object -FilePath $LogFile
$exitCode = $LASTEXITCODE

# 8. Summary
$finalLines = Get-Content $LogFile -Tail 10
$summaryLine = $finalLines | Where-Object { $_ -match "==.* (passed|failed|error|skipped|warning|xfailed|xpassed) in .*" }

Write-Host "`n" + ("=" * 60) -ForegroundColor Gray
Write-Host "                TEST RUN SUMMARY" -ForegroundColor Cyan -NoNewline
Write-Host " (Exit: $exitCode)" -ForegroundColor Gray
Write-Host ("=" * 60) -ForegroundColor Gray

if ($summaryLine) {
    $cleanSummary = $summaryLine.Trim(' =')
    Write-Host " DETAILS : $cleanSummary" -ForegroundColor White
    if ($cleanSummary -match "failed|error") {
        Write-Host " STATUS  : ❌ TESTS FAILED OR ENCOUNTERED ERRORS" -ForegroundColor Red
    } elseif ($cleanSummary -match "warning") {
        Write-Host " STATUS  : ⚠️ PASSED WITH WARNINGS" -ForegroundColor Yellow
    } elseif ($exitCode -eq 0) {
        Write-Host " STATUS  : ✅ ALL TESTS PASSED" -ForegroundColor Green
    }
} elseif ($exitCode -eq 0) {
    Write-Host " STATUS  : ✅ ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host " STATUS  : ❌ EXECUTION FAILED" -ForegroundColor Red
}
Write-Host ("=" * 60) -ForegroundColor Gray

exit $exitCode
