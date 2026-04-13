param (
    [Parameter(Position=0)]
    [ValidateSet("dev", "qa", "staging", "prod")]
    $env_name = "dev",

    [switch]$down,
    [switch]$logs,
    [switch]$build
)

# 1. Docker Command Detection
$dockerCmd = "docker-compose"
if (-not (Get-Command $dockerCmd -ErrorAction SilentlyContinue)) {
    $dockerCmd = "docker compose"
}

if (-not (Get-Command $dockerCmd -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ERROR: Neither docker-compose nor docker compose found." -ForegroundColor Red
    exit 1
}

# 2. Environment File Selection
$env_file = "deploy/environments/.env.local"
if ($env_name -eq "qa") {
    $env_file = "deploy/environments/.env.qa"
} elseif ($env_name -eq "staging") {
    $env_file = "deploy/environments/.env.staging"
} elseif ($env_name -eq "prod") {
    $env_file = "deploy/environments/.env.production"
}

if (-not (Test-Path $env_file)) {
    Write-Host "❌ ERROR: Environment file not found at $env_file" -ForegroundColor Red
    exit 1
}

# 3. Handle 'down'
if ($down) {
    Write-Host "Stopping all HRMS [$env_name] containers..." -ForegroundColor Yellow
    & $dockerCmd --env-file $env_file down
    exit $LASTEXITCODE
}

# 4. Handle 'logs'
if ($logs) {
    Write-Host "Viewing logs for HRMS [$env_name]..." -ForegroundColor Cyan
    & $dockerCmd --env-file $env_file logs -f
    exit $LASTEXITCODE
}

# 5. Handle Start/Build
$build_flag = if ($build) { "--build" } else { "" }

Write-Host "Starting HRMS Platform in [$env_name] mode using [$env_file]..." -ForegroundColor Cyan
if ($build) {
    & $dockerCmd --env-file $env_file up -d --build
} else {
    & $dockerCmd --env-file $env_file up -d
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "System is coming up..." -ForegroundColor Green
    Write-Host "To view logs, run: .\up.ps1 $env_name -logs"
} else {
    Write-Host "❌ ERROR: Failed to start containers (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
}

exit $LASTEXITCODE
