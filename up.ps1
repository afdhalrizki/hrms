param (
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet("dev", "qa", "staging", "prod")]
    $env_name,

    [switch]$down,
    [switch]$logs,
    [switch]$build
)

# 1. Environment File Selection
$env_file = "environments/.env.local"
if ($env_name -eq "qa") {
    $env_file = "environments/.env.qa"
} elseif ($env_name -eq "staging") {
    $env_file = "environments/.env.staging"
} elseif ($env_name -eq "prod") {
    $env_file = "environments/.env.production"
}

# 2. Handle 'down'
if ($down) {
    Write-Host "Stopping all HRMS [$env_name] containers..." -ForegroundColor Yellow
    docker-compose --env-file $env_file down
    exit
}

# 3. Handle 'logs'
if ($logs) {
    docker-compose --env-file $env_file logs -f
    exit
}

# 4. Handle Start/Build
$build_flag = if ($build) { "--build" } else { "" }

Write-Host "Starting HRMS Platform in [$env_name] mode using [$env_file]..." -ForegroundColor Cyan
docker-compose --env-file $env_file up -d $build_flag

Write-Host "System is coming up..." -ForegroundColor Green
Write-Host "To view logs, run: .\up.ps1 $env_name -logs"
