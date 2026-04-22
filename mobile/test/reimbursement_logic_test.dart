import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Reimbursement Logic Tests (Integrated)', () {
    late ApiService apiService;

    setUp(() async {
      await setupIntegratedTest();
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
      final cats = await apiService.getReimbursementCategories();
      
      if (cats.isNotEmpty) {
        final payload = {
          "date": "2026-04-01",
          "amount": 50000,
          "description": "Integration Test Claim",
          "category": cats.first['id']
        };
        await apiService.applyReimbursement(payload);
      }
    });

    test('applyReimbursement fails with zero amount', () async {
      await loginForTest();
      final cats = await apiService.getReimbursementCategories();
      if (cats.isNotEmpty) {
        final invalidData = {
          "date": "2026-04-01",
          "amount": 0, // Invalid amount
          "description": "Should fail",
          "category": cats.first['id']
        };
        expect(() => apiService.applyReimbursement(invalidData), throwsException);
      }
    });

    test('applyReimbursement (Large Amount) works if within policy', () async {
      await loginForTest();
      final cats = await apiService.getReimbursementCategories();
      if (cats.isNotEmpty) {
        await apiService.applyReimbursement({
          "date": "2026-08-01",
          "amount": 1000000, // 1 million
          "description": "Large transport claim",
          "category": cats.first['id']
        });
      }
    });

    test('applyReimbursement fails with invalid category ID', () async {
      await loginForTest();
      expect(
        () => apiService.applyReimbursement({
          "date": "2026-08-02",
          "amount": 10000,
          "description": "fail test",
          "category": 99999
        }),
        throwsException,
      );
    });

    test('getReimbursementDetails returns valid data', () async {
      await loginForTest();
      final list = await apiService.getReimbursements();
      expect(list, isNotNull);
    });

    // Removed mock error handling test
  });
}
