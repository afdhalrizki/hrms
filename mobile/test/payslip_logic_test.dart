import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Payslip Logic Tests (Mocked)', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
    });

    test('downloadPdf processes successfully on 200 OK', () async {
      await loginForTest();
      await apiService.downloadPdf('/payroll/payslips/1/pdf/', 'payslip.pdf');
    });

    test('downloadPdf throws Exception on failure', () async {
      await loginForTest();
      expect(
          apiService.downloadPdf('/payroll/payslips/unknown/pdf/', 'error.pdf'),
          throwsException);
    });
  });
}
