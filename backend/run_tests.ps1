# Helper script to run pytest with local environment variables
$env:DB_HOST="localhost"
$env:DB_USER="hrms_user"
$env:DB_PASSWORD="hrms_password"
$env:DB_NAME="hrms"

Write-Host "Running HRMS Backend Tests..." -ForegroundColor Cyan
.\
