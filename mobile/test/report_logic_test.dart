import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Reporting Logic Unit Tests (Integrated)', () {
    late ApiService apiService;

    setUp(() async {
      await setupIntegratedTest();
      apiService = ApiService();
      await loginForTest();
    });

    test('Attendance: Recap CSV Download', () async {
      final bytes = await apiService.downloadAttendanceRecap('2026-01-01', '2026-12-31', 'csv');
      expect(bytes, isNotNull);
      expect(bytes.length, greaterThan(0));
    });

    test('Attendance: Recap PDF Download', () async {
      final bytes = await apiService.downloadAttendanceRecap('2026-01-01', '2026-12-31', 'pdf');
      expect(bytes, isNotNull);
    });

    test('Payroll: Recap XLSX Download', () async {
      final bytes = await apiService.downloadPayrollRecap(1, 'xlsx');
      expect(bytes, isNotNull);
    });

    test('Payroll: Recap CSV Download', () async {
      final bytes = await apiService.downloadPayrollRecap(1, 'csv');
      expect(bytes, isNotNull);
    });

    test('Payslip: DOCX Download', () async {
      final payslips = await apiService.getPayslips();
      if (payslips.isNotEmpty) {
        final bytes = await apiService.downloadPayslipDOCX(payslips.first['id']);
        expect(bytes, isNotNull);
      }
    });

    test('Reimbursement: Recap XLSX Download', () async {
      final bytes = await apiService.downloadReimbursementRecap('xlsx');
      expect(bytes, isNotNull);
    });

    test('Reimbursement: Individual DOCX Download', () async {
      final reimbursements = await apiService.getReimbursements();
      if (reimbursements.isNotEmpty) {
        final bytes = await apiService.downloadReimbursementDOCX(reimbursements.first['id']);
        expect(bytes, isNotNull);
      }
    });

    test('Performance: Recap XLSX Download', () async {
      final bytes = await apiService.downloadPerformanceRecap('xlsx');
      expect(bytes, isNotNull);
    });

    test('Performance: Appraisal PDF Download', () async {
      final appraisals = await apiService.getAppraisals();
      if (appraisals.isNotEmpty) {
        final bytes = await apiService.downloadAppraisalPDF(appraisals.first['id']);
        expect(bytes, isNotNull);
      }
    });

    test('Generic: downloadFile with Query Params', () async {
      final bytes = await apiService.downloadFile('/attendance/export_csv/', queryParams: {
        'month': '1',
        'year': '2026'
      });
      expect(bytes, isNotNull);
    });
  });
}
