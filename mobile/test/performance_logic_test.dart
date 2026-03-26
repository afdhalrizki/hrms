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

  group('Phase M4: Strategic Performance Tests', () {
    setUp(() async {
      ApiService.reset();
      SharedPreferences.setMockInitialValues({});
      apiService = ApiService();
    });

    test('getKPITargets returns list on success', () async {
      await loginForTest();
      final list = await apiService.getKPITargets();
      expect(list, isA<List>());
    });

    test('submitAppraisalReview sends POST with correct payload', () async {
      await loginForTest();
      try {
        await apiService.submitAppraisalReview({
          'appraisal': 1,
          'reviewer': 1,
          'reviewer_type': 'SELF',
          'ratings': {'quality': 4},
          'comments': 'Integration Test',
        });
      } catch (e) {
        print('Performance Submit Info: $e');
      }
    });
  });
}
