import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Leave Management Logic Tests (Integrated)', () {
    late ApiService apiService;

    setUp(() async {
      await setupIntegratedTest();
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

    test('applyLeave fails with invalid dates (end before start)', () async {
      await loginForTest();
      final invalidData = {
        "start_date": "2026-06-10",
        "end_date": "2026-06-05", // Earlier than start
        "leave_type": "CUTI",
        "reason": "Should fail"
      };
      expect(() => apiService.applyLeave(invalidData), throwsException);
    });

    test('applyLeave (SAKIT) sends POST successfully', () async {
      await loginForTest();
      await apiService.applyLeave({
        "start_date": "2026-07-01",
        "end_date": "2026-07-01",
        "leave_type": "SAKIT",
        "reason": "Health test"
      });
    });

    test('applyLeave fails with non-existent leave type', () async {
      await loginForTest();
      expect(
        () => apiService.applyLeave({
          "start_date": "2026-07-05",
          "end_date": "2026-07-06",
          "leave_type": "GHOST_TYPE",
          "reason": "fail test"
        }),
        throwsException,
      );
    });

    test('getLeaveBalances handles empty state correctly', () async {
      await loginForTest();
      final balances = await apiService.getLeaveBalances();
      expect(balances, isNotNull);
    });

    // Removed mock error handling test as we are in integrated mode
  });
}
