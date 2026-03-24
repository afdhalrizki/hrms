# Vitest Unit Test Master Script
# Usage: .\run_tests.ps1 [-Coverage] [-SkipInstall]

param (
    [switch]$Coverage,      # Run with coverage report
    [switch]$SkipInstall   # Skip npm install check
)

$ScriptDir = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Push-Location $ScriptDir

Write-Host "--- HRMS Frontend Unit Test Automation ---" -ForegroundColor Cyan

# 1. Dependency Check
if (-not $SkipInstall) {
    Write-Host "[1/2] Checking Frontend Dependencies..." -ForegroundColor Yellow
    npm install
}

# 2. Execution
Write-Host "[2/2] Launching Vitest Suite..." -ForegroundColor Cyan

$TestCmd = "npx vitest run"
if ($Coverage) {
    $TestCmd = "npx vitest run --coverage"
}

Write-Host "Executing: $TestCmd" -ForegroundColor Gray
Invoke-Expression $TestCmd

$ExitCode = $LASTEXITCODE

if ($ExitCode -eq 0) {
    Write-Host "`nSUCCESS! All unit tests passed." -ForegroundColor Green
} else {
    Write-Host "`nFAILURE. Some unit tests failed. Check the output above." -ForegroundColor Red
}

Pop-Location
exit $ExitCode
