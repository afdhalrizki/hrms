import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Attendance Logic Tests (Mocked)', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
    });

    test('submitAttendance sends POST and returns parsed data on success', () async {
      await loginForTest();
      
      final result = await apiService.submitAttendance(
        employeeId: 101,
        latitude: -6.123456,
        longitude: 106.123456,
        checkInTime: "08:00:00",
        isClockIn: true,
      );

      expect(result['status'], 'success');
      expect(result['is_late'], false);
    });

    test('getMySchedules returns parsed Schedule objects', () async {
      await loginForTest();
      final schedules = await apiService.getMySchedules();

      expect(schedules, isA<List>());
    });
  });
}
