import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Reimbursement Logic Tests (Mocked)', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
    });

    test('getReimbursementCategories returns categories list', () async {
      await loginForTest();
      final data = await apiService.getReimbursementCategories();

      expect(data, isA<List>());
    });

    test('getReimbursements returns claims list', () async {
      await loginForTest();
      final data = await apiService.getReimbursements();

      expect(data, isA<List>());
    });

    test('applyReimbursement sends POST request successfully', () async {
      await loginForTest();
      
      final payload = {
        "date": "2026-04-01",
        "amount": 50000,
        "description": "Integration Test Claim",
        "category": 1
      };

      await apiService.applyReimbursement(payload);
    });

    test('applyReimbursement throws on failure', () async {
      await loginForTest();
      mockErrorStatus = true;
      expect(apiService.applyReimbursement({}), throwsA(isA<Exception>()));
    });
  });
}
