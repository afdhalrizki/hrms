# Backend E2E Coverage Reporter
# Aggregates coverage files from E2E runs into a separate report

$PSScriptRoot = $PSScriptRoot
$VenvDir = Join-Path $PSScriptRoot "venv"
$PythonExec = Join-Path $VenvDir "Scripts\python.exe"

Push-Location $PSScriptRoot

Write-Host "--- Generating Backend E2E Coverage Report ---" -ForegroundColor Cyan

# 1. Combine parallel coverage files
if (Get-ChildItem -Path . -Filter ".coverage.*") {
    Write-Host "Combining coverage data..." -ForegroundColor Gray
    & $PythonExec -m coverage combine
} else {
    Write-Host "No parallel coverage files (.coverage.*) found. Using base .coverage file." -ForegroundColor Yellow
}

# 2. Output HTML report to a separate folder as requested
$ReportDir = Join-Path $PSScriptRoot "../e2e/backend/coverage"
if (-not (Test-Path $ReportDir)) { New-Item -ItemType Directory -Path $ReportDir | Out-Null }

Write-Host "Generating HTML report in $ReportDir ..." -ForegroundColor Gray
& $PythonExec -m coverage html -d $ReportDir

Write-Host "✅ Backend E2E Coverage Report generated!" -ForegroundColor Green
Write-Host "Open: $(Join-Path $ReportDir 'index.html')" -ForegroundColor Gray

Pop-Location
