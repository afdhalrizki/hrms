import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Phase M3: Attendance Correction Tests (Integrated)', () {
    late ApiService apiService;

    setUp(() async {
      await setupIntegratedTest();
      apiService = ApiService();
    });

    test('getAttendanceRecords returns list on success', () async {
      await loginForTest();
      final list = await apiService.getAttendanceRecords();
      expect(list, isA<List>());
    });

    test('getCorrectionRequests returns list on success', () async {
      await loginForTest();
      final list = await apiService.getCorrectionRequests();
      expect(list, isA<List>());
    });

    test('submitCorrectionRequest fails with missing attendance ID', () async {
      await loginForTest();
      expect(
        () => apiService.submitCorrectionRequest({
          'requested_check_in': '08:00:00',
          'reason': 'test fail',
        }),
        throwsException,
      );
    });
  });
}
