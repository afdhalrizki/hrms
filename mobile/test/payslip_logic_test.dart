import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Phase M2: Payslip Tests (Mocked)', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
      await loginForTest();
    });

    test('getPayslips return list', () async {
      final res = await apiService.getPayslips();
      expect(res, isA<List>());
      expect(res.isNotEmpty, true);
    });

    test('getPayslips throws on failure', () async {
      mockErrorStatus = true;
      expect(apiService.getPayslips(),
          throwsA(isA<Exception>()));
    });
  });
}
