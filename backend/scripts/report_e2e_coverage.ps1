# Backend E2E Coverage Reporter (PowerShell)
# Aggregates coverage files from E2E runs into a separate report

$ErrorActionPreference = "Stop"

$BackendDir = Split-Path -Parent $PSScriptRoot
$VenvDir = Join-Path $BackendDir "venv"
$PythonExec = if ($IsWindows) { Join-Path $VenvDir "Scripts\python.exe" } else { Join-Path $VenvDir "bin/python" }

function Get-PythonCommand {
    if (Test-Path $PythonExec) { return $PythonExec }
    return "python"
}

Push-Location $BackendDir

Write-Host "--- Generating Backend E2E Coverage Report ---" -ForegroundColor Cyan

$pythonPath = Get-PythonCommand
$coverageFile = Join-Path $BackendDir ".coverage"
$reportDir = Join-Path $BackendDir "coverage"

# 1. Combine parallel coverage files
$fragments = Get-ChildItem -Path $BackendDir -Filter ".coverage.*" -File -ErrorAction SilentlyContinue
if ($fragments) {
    Write-Host "Combining coverage data..." -ForegroundColor Gray
    & $pythonPath -m coverage combine --data-file $coverageFile
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: coverage combine failed." -ForegroundColor Red
        Pop-Location
        exit $LASTEXITCODE
    }
} else {
    Write-Host "No parallel coverage files (.coverage.*) found. Using base .coverage file." -ForegroundColor Yellow
}

# 2. Output HTML report
if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir | Out-Null }

Write-Host "Generating HTML report in $reportDir ..." -ForegroundColor Gray
& $pythonPath -m coverage html --data-file $coverageFile -d $reportDir
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: coverage html generation failed." -ForegroundColor Red
    Pop-Location
    exit $LASTEXITCODE
}

Write-Host "✅ Backend E2E Coverage Report generated!" -ForegroundColor Green
Write-Host "Open: $(Join-Path $reportDir 'index.html')" -ForegroundColor Gray

Pop-Location
exit 0
