import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Leave Management Logic Tests (Mocked)', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
    });

    test('getLeaveBalances returns balance data on success', () async {
      await loginForTest();
      final data = await apiService.getLeaveBalances();

      expect(data, isA<List>());
    });

    test('getLeaveRequests returns requests list', () async {
      await loginForTest();
      final data = await apiService.getLeaveRequests();

      expect(data, isA<List>());
    });

    test('applyLeave sends POST request successfully', () async {
      await loginForTest();
      final payload = {
        "start_date": "2026-04-01",
        "end_date": "2026-04-02",
        "leave_type": "CUTI",
        "reason": "Integration Test"
      };

      await apiService.applyLeave(payload);
    });

    test('applyLeave throws on failure', () async {
      await loginForTest();
      mockErrorStatus = true;
      expect(apiService.applyLeave({}), throwsA(isA<Exception>()));
    });
  });
}
