param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    $env_name,

    [switch]$down,
    [switch]$logs
)

if ($down) {
    Write-Host "Stopping all HRMS containers..." -ForegroundColor Yellow
    docker-compose down
    exit
}

$env_file = "environments/.env.local"
if ($env_name -eq "staging") {
    $env_file = "environments/.env.staging"
} elseif ($env_name -eq "prod") {
    $env_file = "environments/.env.production"
}

if ($logs) {
    docker-compose --env-file $env_file logs -f
    exit
}

Write-Host "Starting HRMS Platform in [$env_name] mode using [$env_file]..." -ForegroundColor Cyan
docker-compose --env-file $env_file up -d

Write-Host "System is coming up..." -ForegroundColor Green
Write-Host "To view logs, run: .\up.ps1 $env_name -logs"
