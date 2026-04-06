import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('ApiService Deep Unit Tests', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
    });

    test('Auth flow: login, getToken, logout', () async {
      await apiService.login('test@test.com', 'password', 'company1');
      expect(await apiService.getToken(), 'mock_access');
      
      await apiService.logout();
      expect(await apiService.getToken(), isNull);
    });

    test('Attendance & Corrections', () async {
      await loginForTest();
      final records = await apiService.getAttendanceRecords();
      expect(records, isA<List>());
      
      final requests = await apiService.getCorrectionRequests();
      expect(requests, isA<List>());
      
      // submitCorrectionRequest returns Future<void>
      await apiService.submitCorrectionRequest({'reason': 'test'});
    });

    test('Leave Management', () async {
      await loginForTest();
      final balances = await apiService.getLeaveBalances();
      expect(balances, isA<List>());
      
      // applyLeave returns Future<void>
      await apiService.applyLeave({'type': 'ANNUAL'});
    });

    test('Reimbursement', () async {
      await loginForTest();
      final cats = await apiService.getReimbursementCategories();
      expect(cats, isA<List>());
      
      // applyReimbursement returns Future<void>
      await apiService.applyReimbursement({'amount': 100});
    });

    test('Schedule & Appraisal', () async {
      await loginForTest();
      final records = await apiService.getAttendanceRecords();
      expect(records, isA<List>());
      
      final appraisals = await apiService.getAppraisals();
      expect(appraisals, isA<List>());

      // submitAppraisalReview returns Future<void>
      await apiService.submitAppraisalReview({'score': 5});
    });

    test('Payslips & Documents', () async {
      await loginForTest();
      final payslips = await apiService.getPayslips();
      expect(payslips, isA<List>());
      
      await apiService.uploadDocument(1, 'ktp', [0, 1, 2], 'test.jpg');
      await apiService.downloadPdf('/test.pdf', 'test.pdf');
    });

    test('Profile Update', () async {
      await loginForTest();
      final result = await apiService.updateProfile(1, {'fullname': 'Admin One'});
      expect(result['fullname'], 'Admin One');
    });

    test('Error Handling across endpoints', () async {
      await loginForTest();
      mockErrorStatus = true;
      mockErrorMessage = 'Server Down';

      expect(apiService.getUserProfile(), throwsA(isA<Exception>()));
      expect(apiService.getAttendanceRecords(), throwsA(isA<Exception>()));
      expect(apiService.getLeaveRequests(), throwsA(isA<Exception>()));
      expect(apiService.getReimbursements(), throwsA(isA<Exception>()));
      expect(apiService.getPayslips(), throwsA(isA<Exception>()));
      expect(apiService.applyLeave({}), throwsA(isA<Exception>()));
      expect(apiService.submitCorrectionRequest({}), throwsA(isA<Exception>()));
      expect(apiService.applyReimbursement({}), throwsA(isA<Exception>()));
      expect(apiService.updateProfile(1, {}), throwsA(isA<Exception>()));
    });
  });
}
