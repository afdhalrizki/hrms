# Vitest Unit Test Master Script
# Usage: .\run_unit_tests.ps1 [-Coverage] [-SkipInstall]

param (
    [switch]$Coverage,      # Run with coverage report
    [switch]$SkipInstall,  # Skip npm install check
    [switch]$Quick        # Run with minimal dependencies and faster mode
)

$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Push-Location $ScriptDir

Write-Host "--- HRMS Frontend Unit Test Automation ---" -ForegroundColor Cyan

# Ensuring log directory exists
$LogDir = Join-Path $ScriptDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$LogFile = Join-Path $LogDir ("unit_test_{0}.log" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))

# 1. Dependency Check
if (-not $SkipInstall) {
    Write-Host "[1/2] Checking Frontend Dependencies..." -ForegroundColor Yellow
    npm install
}

# 2. Execution
Write-Host "[2/2] Launching Vitest Suite..." -ForegroundColor Cyan
Write-Host "Logging output to: $LogFile" -ForegroundColor Gray

$TestCmd = "npx vitest run --pool=threads --maxWorkers 8"
if ($Coverage) {
    $TestCmd = "npx vitest run --coverage --pool=threads --maxWorkers 8"
} elseif ($Quick) {
    $TestCmd = "npx vitest run --pool=threads --maxWorkers 4"
}

Write-Host "Executing: $TestCmd" -ForegroundColor Gray
Invoke-Expression "$TestCmd | Tee-Object -FilePath '$LogFile'"

$ExitCode = $LASTEXITCODE

if ($ExitCode -eq 0) {
    Write-Host "`nSUCCESS! All unit tests passed." -ForegroundColor Green
} else {
    Write-Host "`nFAILURE. Some unit tests failed. Check the output above." -ForegroundColor Red
}

Pop-Location
exit $ExitCode
