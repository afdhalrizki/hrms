# Vitest Unit Test Master Script (PowerShell)
# Usage: .\run_unit_tests.ps1 [-Coverage] [-SkipInstall] [-Quick]

param (
    [switch]$Coverage,      # Run with coverage report
    [switch]$SkipInstall,   # Skip npm install check
    [switch]$Quick          # Run with minimal dependencies and faster mode
)

$ErrorActionPreference = "Stop"

$FrontendDir = Split-Path -Parent $PSScriptRoot
Push-Location $FrontendDir

Write-Host "--- HRMS Frontend Unit Test Automation ---" -ForegroundColor Cyan

# Ensuring log directory exists
$LogDir = Join-Path $FrontendDir "logs"
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

$workers = if ($Quick) { 4 } else { 8 }
$vitestArgs = @("vitest", "run", "--pool=threads", "--maxWorkers", $workers, "--reporter=verbose", "--reporter=json", "--outputFile=logs/unit_results.json")
if ($Coverage) { $vitestArgs += "--coverage" }

& npx @vitestArgs 2>&1 | Tee-Object -FilePath $LogFile
$ExitCode = $LASTEXITCODE

if ($ExitCode -eq 0) {
    Write-Host "`nSUCCESS! All unit tests passed." -ForegroundColor Green
} else {
    Write-Host "`nFAILURE. Some unit tests failed." -ForegroundColor Red
}

Pop-Location
exit $ExitCode
