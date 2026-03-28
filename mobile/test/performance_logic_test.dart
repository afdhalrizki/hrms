import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Phase M4: Strategic Performance Tests (Mocked)', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
    });

    test('getKPITargets returns list on success', () async {
      await loginForTest();
      final list = await apiService.getKPITargets();
      expect(list, isA<List>());
    });

    test('submitAppraisalReview sends POST successfully', () async {
      await loginForTest();
      await apiService.submitAppraisalReview({
        'appraisal': 1,
        'reviewer': 1,
        'reviewer_type': 'SELF',
        'ratings': {'quality': 4},
        'comments': 'Integration Test',
      });
    });
  });
}
