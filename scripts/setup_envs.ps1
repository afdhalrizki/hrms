# HRMS Portable SDK Setup Script (Windows/PowerShell)
# This script downloads and extracts the required SDKs (Flutter, JDK, Android Tools) into the tools/ directory.

$ErrorActionPreference = "Stop"

# --- Configuration ---
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$ToolsDir = Join-Path $RootDir "tools"

$SDKs = @(
    @{
        Name = "Flutter SDK"
        URL  = "https://storage.googleapis.com/flutter_infra_release/releases/stable/windows/flutter_windows_3.22.0-stable.zip"
        Out  = "flutter.zip"
        Dest = "flutter"
    },
    @{
        Name = "Microsoft OpenJDK 17"
        URL  = "https://aka.ms/download-jdk/microsoft-jdk-17-windows-x64.zip"
        Out  = "jdk17.zip"
        Dest = "jdk17"
    },
    @{
        Name = "Android Command Line Tools"
        URL  = "https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip"
        Out  = "cmdline-tools.zip"
        Dest = "android-sdk"
    }
)

if (-not (Test-Path $ToolsDir)) {
    Write-Host "📂 Creating tools directory..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $ToolsDir | Out-Null
}

foreach ($sdk in $SDKs) {
    $destPath = Join-Path $ToolsDir $sdk.Dest
    $zipPath = Join-Path $ToolsDir $sdk.Out

    if (Test-Path $destPath) {
        Write-Host "✅ $($sdk.Name) is already installed at $destPath. Skipping..." -ForegroundColor Green
        continue
    }

    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "🚀 Processing $($sdk.Name)..." -ForegroundColor Yellow

    # 1. Download
    if (-not (Test-Path $zipPath)) {
        Write-Host "📥 Downloading from $($sdk.URL)..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $sdk.URL -OutFile $zipPath -ShowProgress
    }

    # 2. Extract
    Write-Host "📦 Extracting to $destPath..." -ForegroundColor Cyan
    
    # Create a temp dir for extraction to handle nested structures correctly
    $tempExtract = Join-Path $ToolsDir "temp_extract"
    if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract }
    New-Item -ItemType Directory -Path $tempExtract | Out-Null

    Expand-Archive -Path $zipPath -DestinationPath $tempExtract -Force

    # 3. Handle Special Structures
    if ($sdk.Dest -eq "android-sdk") {
        # Android Tools need a specific structure: android-sdk/cmdline-tools/latest/
        $sdkRoot = New-Item -ItemType Directory -Path (Join-Path $ToolsDir "android-sdk/cmdline-tools/latest") -Force
        Move-Item -Path (Join-Path $tempExtract "cmdline-tools/*") -Destination $sdkRoot.FullName -Force
    } elseif ($sdk.Dest -eq "jdk17") {
        # JDK zip often contains a single top-level folder like 'jdk-17.x.x'
        $innerDir = Get-ChildItem -Path $tempExtract -Directory | Select-Object -First 1
        Move-Item -Path $innerDir.FullName -Destination $destPath -Force
    } else {
        # Standard extraction (like Flutter)
        $innerDir = Get-ChildItem -Path $tempExtract -Directory | Select-Object -First 1
        Move-Item -Path $innerDir.FullName -Destination $destPath -Force
    }

    # 4. Cleanup
    Write-Host "🧹 Cleaning up temporary files..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $tempExtract
    Remove-Item -Path $zipPath

    Write-Host "✨ $($sdk.Name) installed successfully!" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "🏆 All Portable SDKs are ready!" -ForegroundColor Green
Write-Host "Location: $ToolsDir"
Write-Host "========================================" -ForegroundColor Green
Write-Host "Note: You may need to add these paths to your system Environment Variables if they aren't already set in local.properties."
