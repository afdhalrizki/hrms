# HRMS Backend Test Runner (PowerShell)
# This script ensures Docker services are running and then executes pytest.

$ErrorActionPreference = "Stop"

# 1. Setup Paths
$BackendDir = $PSScriptRoot
Push-Location $BackendDir
$RootDir = Split-Path -Parent $BackendDir
$EnvFile = Join-Path $RootDir "environments\.env.local"
$VenvDir = Join-Path $BackendDir "venv"
$PytestExec = Join-Path $VenvDir "Scripts\pytest.exe"

Write-Host "--- HRMS Backend Test Environment Setup ---" -ForegroundColor Cyan

# 2. Check for .env.local
if (-not (Test-Path $EnvFile)) {
    Write-Error "Could not find environment file at $EnvFile. Please ensure it exists."
}

# 3. Handle Docker Services (DB, Redis, PgBouncer)
Write-Host "[1/3] Ensuring Docker services (db, redis, pgbouncer) are running..." -ForegroundColor Yellow

# Check if Docker is running
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker daemon is not running. Please start Docker Desktop first!" -ForegroundColor Red
    exit 1
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
Write-Host "[3/3] Checking pytest in virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $PytestExec)) {
    Write-Host "pytest not found in $VenvDir. Please ensure venv is setup and dependencies are installed." -ForegroundColor Red
    exit 1
}

# 6. Run Pytest
Write-Host "--- Running HRMS Backend Unit Tests ---" -ForegroundColor Green

# Create a temporary file to capture output for parsing
$tempFile = [System.IO.Path]::GetTempFileName()
try {
    # Dynamically detect terminal width for better alignment when piped
    $termWidth = if ($Host.UI.RawUI.WindowSize.Width -gt 0) { $Host.UI.RawUI.WindowSize.Width } else { 120 }
    
    # Force color output and pass detected terminal width
    & $PytestExec --color=yes -o "terminal_width=$termWidth" @args | Tee-Object -FilePath $tempFile
    $exitCode = $LASTEXITCODE

    # 7. Final Summary Parsing
    $finalLines = Get-Content $tempFile -Tail 10
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
    if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
}

Pop-Location
exit $exitCode
