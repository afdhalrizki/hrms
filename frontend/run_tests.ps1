# Vitest Unit Test Master Script
# Usage: .\run_tests.ps1 [-Coverage] [-SkipInstall]

param (
    [switch]$Coverage,      # Run with coverage report
    [switch]$SkipInstall   # Skip npm install check
)

$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition
Push-Location $PSScriptRoot

Write-Host "--- HRMS Frontend Unit Test Automation ---" -ForegroundColor Cyan

# 1. Dependency Check
if (-not $SkipInstall) {
    Write-Host "[1/2] Checking Frontend Dependencies..." -ForegroundColor Yellow
    npm install
}

# 2. Execution
Write-Host "[2/2] Launching Vitest Suite..." -ForegroundColor Cyan

$TestCmd = "npm test"
if ($Coverage) {
    $TestCmd = "npx vitest run --coverage"
} else {
    $TestCmd = "npx vitest run"
}

Write-Host "Executing: $TestCmd" -ForegroundColor Gray
Invoke-Expression $TestCmd

$ExitCode = $LASTEXITCODE

if ($ExitCode -eq 0) {
    Write-Host "`nSUCCESS! All unit tests passed." -ForegroundColor Green
} else {
    Write-Host "`nFAILURE. Some unit tests failed. Check the output above." -ForegroundColor Red
}

exit $ExitCode
