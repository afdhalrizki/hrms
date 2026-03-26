param(
    [switch]$Web = $false,
    [switch]$Windows = $false
)

Write-Host "🚀 Launching harikerja Mobile (Development)..." -ForegroundColor Cyan

if ($Web) {
    flutter run -d chrome
} elseif ($Windows) {
    flutter run -d windows
} else {
    flutter run
}
