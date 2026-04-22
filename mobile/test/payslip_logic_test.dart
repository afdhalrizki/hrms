import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Phase M2: Payslip Tests (Integrated)', () {
    late ApiService apiService;

    setUp(() async {
      await setupIntegratedTest();
      apiService = ApiService();
      await loginForTest();
    });

    test('getPayslips return list', () async {
      final res = await apiService.getPayslips();
      expect(res, isA<List>());
      expect(res.isNotEmpty, true);
    });

    // Removed mock error handling test
  });
}
