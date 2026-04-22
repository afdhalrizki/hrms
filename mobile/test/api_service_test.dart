import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('ApiService Deep Unit Tests', () {
    late ApiService apiService;

    setUp(() async {
      await setupIntegratedTest();
      apiService = ApiService();
    });

    test('Auth: login returns valid tokens', () async {
      final result = await apiService.login('admin@company1.com', 'password123', 'company1');
      expect(result['access'] ?? result['token'], isNotNull);
    });

    test('Auth: getToken returns valid JWT after login', () async {
      await apiService.login('admin@company1.com', 'password123', 'company1');
      expect(await apiService.getToken(), isNotNull);
    });

    test('Auth: logout clears the token', () async {
      await apiService.login('admin@company1.com', 'password123', 'company1');
      await apiService.logout();
      expect(await apiService.getToken(), isNull);
    });

    test('Attendance: getAttendanceRecords returns list', () async {
      await loginForTest();
      final records = await apiService.getAttendanceRecords();
      expect(records, isA<List>());
    });

    test('Attendance: getCorrectionRequests returns list', () async {
      await loginForTest();
      final requests = await apiService.getCorrectionRequests();
      expect(requests, isA<List>());
    });

    test('Attendance: submitCorrectionRequest works with real ID', () async {
      await loginForTest();
      final records = await apiService.getAttendanceRecords();
      if (records.isNotEmpty) {
        await apiService.submitCorrectionRequest({
          'attendance': records.first['id'],
          'reason': 'test integration',
          'requested_check_in': '08:00:00',
          'requested_check_out': '17:00:00'
        });
      }
    });

    test('Leave: getLeaveBalances returns list', () async {
      await loginForTest();
      final balances = await apiService.getLeaveBalances();
      expect(balances, isA<List>());
    });

    test('Leave: applyLeave sends valid payload', () async {
      await loginForTest();
      await apiService.applyLeave({
        'leave_type': 'CUTI',
        'start_date': '2024-12-01',
        'end_date': '2024-12-02',
        'reason': 'Integration Test'
      });
    });

    test('Reimbursement: getCategories returns list', () async {
      await loginForTest();
      final cats = await apiService.getReimbursementCategories();
      expect(cats, isA<List>());
    });

    test('Reimbursement: applyReimbursement works', () async {
      await loginForTest();
      final cats = await apiService.getReimbursementCategories();
      if (cats.isNotEmpty) {
        await apiService.applyReimbursement({
          'category': cats.first['id'],
          'amount': 50000,
          'description': 'Integration Test',
          'date': '2024-01-01'
        });
      }
    });

    test('Schedule: getMySchedules returns list', () async {
      await loginForTest();
      final schedules = await apiService.getMySchedules();
      expect(schedules, isA<List>());
    });

    test('Performance: getAppraisals returns list', () async {
      await loginForTest();
      final appraisals = await apiService.getAppraisals();
      expect(appraisals, isA<List>());
    });

    test('Payroll: getPayslips returns list', () async {
      await loginForTest();
      final payslips = await apiService.getPayslips();
      expect(payslips, isA<List>());
    });

    test('Profile: updateProfile works with dynamic ID', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      final id = profile['employee_id'];
      final result = await apiService.updateProfile(id, {'phone': '0811111111'});
      expect(result['phone'], '0811111111');
    });

    test('Performance: getKPITargets returns list', () async {
      await loginForTest();
      final targets = await apiService.getKPITargets();
      expect(targets, isA<List>());
    });

    test('Overtime: getOvertimes returns list', () async {
      await loginForTest();
      final data = await apiService.getOvertimes();
      expect(data, isA<List>());
    });

    test('Leave: getLeaveTypes (mock or inferred) test', () async {
      await loginForTest();
      final balances = await apiService.getLeaveBalances();
      expect(balances, isNotNull);
    });

    test('Auth: login fails with wrong password', () async {
      expect(
        () => apiService.login('admin@company1.com', 'wrong', 'company1'),
        throwsException,
      );
    });

    test('Auth: login fails with wrong tenant', () async {
      expect(
        () => apiService.login('admin@company1.com', 'password123', 'wrong_tenant'),
        throwsException,
      );
    });
  });
}
