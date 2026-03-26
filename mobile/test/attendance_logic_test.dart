import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'test_helper.dart';

void main() {
  HttpOverrides.global = MyHttpOverrides();
  TestWidgetsFlutterBinding.ensureInitialized();
  late ApiService apiService;

  setUpAll(() {
    setupSecureStorageMock();
  });

  setUp(() async {
    ApiService.reset();
    // Use real SharedPreferences for real backend state
    SharedPreferences.setMockInitialValues({});
    apiService = ApiService();
  });

  group('Attendance Logic Tests', () {
    test('submitAttendance sends POST and returns parsed data on success', () async {
      await loginForTest();
      final profile = await apiService.getUserProfile();
      final employeeId = profile['employee_id'];

      final result = await apiService.submitAttendance(
        employeeId: employeeId,
        latitude: -6.123456,
        longitude: 106.123456,
        checkInTime: "08:00:00",
        isClockIn: true,
      );

      expect(result['status'], isNotNull);
      expect(result['is_late'], isNotNull);
    });

    test('submitAttendance throws Exception on geofence failure (400)', () async {
      await loginForTest();
      final profile = await apiService.getUserProfile();
      final employeeId = profile['employee_id'];

      expect(
          () => apiService.submitAttendance(
                employeeId: employeeId,
                latitude: -1.999999, // Too far from Office
                longitude: 106.999999,
                checkInTime: "08:00:00",
              ),
          throwsException);
    });

    test('getMySchedules returns parsed Schedule objects', () async {
      await loginForTest();
      final schedules = await apiService.getMySchedules();

      // We expect at least an empty list or seeded schedules
      expect(schedules, isA<List>());
    });
  });
}
