import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Phase M3: Attendance Correction Tests (Mocked)', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
    });

    test('getAttendanceRecords returns list on success', () async {
      await loginForTest();
      final list = await apiService.getAttendanceRecords();
      expect(list, isA<List>());
    });

    test('submitCorrectionRequest sends POST successfully', () async {
      await loginForTest();
      await apiService.submitCorrectionRequest({
        'attendance': 1,
        'requested_check_in': '08:00:00',
        'requested_check_out': '17:00:00',
        'reason': 'Integration Test',
      });
    });
  });
}
