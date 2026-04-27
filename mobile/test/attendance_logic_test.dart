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
      
      // Use a date that is unlikely to collide: 2030 + random day
      final randomDay = (DateTime.now().millisecondsSinceEpoch % 28) + 1;
      final testDate = '2030-11-${randomDay.toString().padLeft(2, "0")}';

      final result = await apiService.submitAttendance(
        employeeId: employeeId,
        latitude: -6.123456,
        longitude: 106.123456,
        checkTime: "08:00:00",
        isClockIn: true,
        date: testDate,
      );

      expect(result['id'], isNotNull);
    });

    test('submitAttendance (Clock Out) works correctly', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      final employeeId = profile['employee_id'];
      final randomDay = (DateTime.now().millisecondsSinceEpoch % 28) + 1;
      final testDate = '2030-10-${randomDay.toString().padLeft(2, "0")}';

      // Ensure a clock-in exists first for the same day
      await apiService.submitAttendance(
        employeeId: employeeId,
        latitude: -6.123456,
        longitude: 106.123456,
        checkTime: "08:00:00",
        isClockIn: true,
        date: testDate,
      );
      
      final result = await apiService.submitAttendance(
        employeeId: employeeId,
        latitude: -6.123456,
        longitude: 106.123456,
        checkTime: "17:00:00",
        isClockIn: false,
        date: testDate,
      );

      expect(result['id'], isNotNull);
    });

    test('submitAttendance fails on duplicate date submission', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      final employeeId = profile['employee_id'];
      final randomDay = (DateTime.now().millisecondsSinceEpoch % 28) + 1;
      final testDate = '2030-05-${randomDay.toString().padLeft(2, "0")}';

      // First submission
      await apiService.submitAttendance(
        employeeId: employeeId,
        latitude: -6.0,
        longitude: 106.0,
        checkTime: '08:00:00',
        date: testDate,
      );

      // Duplicate submission should fail
      expect(
        () => apiService.submitAttendance(
          employeeId: employeeId,
          latitude: -6.0,
          longitude: 106.0,
          checkTime: '09:00:00',
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
