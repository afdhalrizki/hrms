Write-Host "🧪 Running Mobile End-to-End Tests (Real Backend Hybrid Mode)..." -ForegroundColor Cyan

# Hybrid VM mode is the most reliable for real-backend integration in Flutter.
# It uses the local Dart VM to hit the backend while rendering widgets in memory.
flutter test test/e2e_test.dart
