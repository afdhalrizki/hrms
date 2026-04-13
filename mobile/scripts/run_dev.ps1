# Mobile Development Launcher (PowerShell)
# Usage: .\run_dev.ps1 [-Web] [-Windows]

param(
    [switch]$Web,
    [switch]$Windows
)

$ErrorActionPreference = "Stop"

$MobileDir = $PSScriptRoot
Push-Location $MobileDir

Write-Host "🚀 Launching harikerja Mobile (Development)..." -ForegroundColor Cyan

$flutterArgs = @("run")
if ($Web) {
    $flutterArgs += @("-d", "chrome")
} elseif ($Windows) {
    $flutterArgs += @("-d", "windows")
}

try {
    & flutter @flutterArgs
} catch {
    Write-Host "❌ FATAL ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location
