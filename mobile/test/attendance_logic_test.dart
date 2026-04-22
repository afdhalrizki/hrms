import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Attendance Logic Tests (Integrated)', () {
    late ApiService apiService;

    setUp(() async {
      await setupIntegratedTest();
      apiService = ApiService();
    });

    tearDown(() async {
      await tearDownIntegratedTest();
    });

    test('submitAttendance sends POST and returns parsed data on success', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      final employeeId = profile['employee_id'];
      
      final result = await apiService.submitAttendance(
        employeeId: employeeId,
        latitude: -6.123456,
        longitude: 106.123456,
        checkInTime: "08:00:00",
        isClockIn: true,
        date: '2026-12-31',
      );

      expect(result['id'], isNotNull);
    });

    test('submitAttendance (Clock Out) works correctly', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      final employeeId = profile['employee_id'];
      
      final result = await apiService.submitAttendance(
        employeeId: employeeId,
        latitude: -6.123456,
        longitude: 106.123456,
        checkInTime: "17:00:00",
        isClockIn: false,
        date: '2026-12-30',
      );

      expect(result['id'], isNotNull);
    });

    test('submitAttendance fails on duplicate date submission', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      final employeeId = profile['employee_id'];
      final testDate = '2026-05-20';

      // First submission
      await apiService.submitAttendance(
        employeeId: employeeId,
        latitude: -6.0,
        longitude: 106.0,
        checkInTime: '08:00:00',
        date: testDate,
      );

      // Duplicate submission should fail
      expect(
        () => apiService.submitAttendance(
          employeeId: employeeId,
          latitude: -6.0,
          longitude: 106.0,
          checkInTime: '09:00:00',
          date: testDate,
        ),
        throwsException,
      );
    });

    test('getAttendanceHistory returns data', () async {
      await loginForTest();
      final history = await apiService.getAttendanceRecords();
      expect(history, isA<List>());
    });
  });
}
