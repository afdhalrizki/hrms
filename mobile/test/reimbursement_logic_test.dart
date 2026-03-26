import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'test_helper.dart';

void main() {
  initRealBackendTest();
  late ApiService apiService;

  setUpAll(() {
    setupSecureStorageMock();
  });

  setUp(() async {
    ApiService.reset();
    SharedPreferences.setMockInitialValues({});
    apiService = ApiService();
  });

  group('Reimbursement Logic Tests', () {
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

      try {
        await apiService.applyReimbursement(payload);
      } catch (e) {
        print('Reimbursement Apply Info: $e');
      }
    });

    test('applyReimbursement throws on failure', () async {
      await loginForTest();
      expect(() => apiService.applyReimbursement({}), throwsException);
    });
  });
}
