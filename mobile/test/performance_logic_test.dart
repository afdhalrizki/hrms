import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Phase M4: Strategic Performance Tests (Integrated)', () {
    late ApiService apiService;

    setUp(() async {
      await setupIntegratedTest();
      apiService = ApiService();
    });

    test('getKPITargets returns list on success', () async {
      await loginForTest();
      final list = await apiService.getKPITargets();
      expect(list, isA<List>());
    });

    test('getAppraisals returns list on success', () async {
      await loginForTest();
      final list = await apiService.getAppraisals();
      expect(list, isA<List>());
    });

    test('submitAppraisalReview fails with invalid appraisal ID', () async {
      await loginForTest();
      expect(
        () => apiService.submitAppraisalReview({
          'appraisal': 9999,
          'comments': 'should fail',
        }),
        throwsException,
      );
    });
  });
}
