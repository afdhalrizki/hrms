param (
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "staging", "prod")]
    $env_name
)

$env_file = ""
if ($env_name -eq "dev") {
    $env_file = "environments/.env.local"
} elseif ($env_name -eq "staging") {
    $env_file = "environments/.env.staging"
} elseif ($env_name -eq "prod") {
    $env_file = "environments/.env.production"
}

Write-Host "Starting HRMS Platform in [$env_name] mode using [$env_file]..." -ForegroundColor Cyan

# Stop existing containers if running
docker-compose --env-file $env_file down

# Start containers
docker-compose --env-file $env_file up -d

Write-Host "System is coming up..." -ForegroundColor Green
Write-Host "To view logs, run: docker-compose --env-file $env_file logs -f"
