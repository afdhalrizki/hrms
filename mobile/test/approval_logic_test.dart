import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  final apiService = ApiService();

  group('Approval Logic Tests (Integrated)', () {
    setUp(() async {
      await setupTestEnvironment();
    });

    test('Leave: Approve request updates status to APPROVED', () async {
      await loginForTest();
      await apiService.applyLeave({
        "start_date": "2026-05-10",
        "end_date": "2026-05-11",
        "leave_type": "SAKIT",
        "reason": "Approve test"
      });
      final requests = await apiService.getLeaveRequests();
      final id = requests.firstWhere((r) => r['status'] == 'PENDING')['id'];
      await apiService.updateLeaveStatus(id, 'APPROVED', 'OK');
      final updated = await apiService.getLeaveRequests();
      expect(updated.firstWhere((r) => r['id'] == id)['status'], 'APPROVED');
    });

    test('Leave: Reject request updates status to REJECTED', () async {
      await loginForTest();
      await apiService.applyLeave({
        "start_date": "2026-05-12",
        "end_date": "2026-05-13",
        "leave_type": "SAKIT",
        "reason": "Reject test"
      });
      final requests = await apiService.getLeaveRequests();
      final id = requests.firstWhere((r) => r['status'] == 'PENDING')['id'];
      await apiService.updateLeaveStatus(id, 'REJECTED', 'No');
      final updated = await apiService.getLeaveRequests();
      expect(updated.firstWhere((r) => r['id'] == id)['status'], 'REJECTED');
    });

    test('Reimbursement: Approve claim updates status to APPROVED', () async {
      await loginForTest();
      final cats = await apiService.getReimbursementCategories();
      await apiService.applyReimbursement({
        "date": "2026-04-22",
        "amount": 25000,
        "description": "Approve test",
        "category": cats.first['id']
      });
      final claims = await apiService.getReimbursements();
      final id = claims.firstWhere((r) => r['status'] == 'PENDING')['id'];
      await apiService.updateReimbursementStatus(id, 'APPROVED', 'OK');
      final updated = await apiService.getReimbursements();
      expect(updated.firstWhere((r) => r['id'] == id)['status'], 'APPROVED');
    });

    test('Attendance Correction: Approve request updates status to APPROVED', () async {
      await loginForTest();
      final records = await apiService.getAttendanceRecords();
      if (records.isNotEmpty) {
        await apiService.submitCorrectionRequest({
          'attendance': records.first['id'],
          'reason': 'Correction test',
          'requested_check_in': '08:15:00',
          'requested_check_out': '17:00:00'
        });
        final requests = await apiService.getCorrectionRequests();
        final id = requests.firstWhere((r) => r['status'] == 'PENDING')['id'];
        await apiService.updateCorrectionStatus(id, 'APPROVED', 'OK');
        final updated = await apiService.getCorrectionRequests();
        expect(updated.firstWhere((r) => r['id'] == id)['status'], 'APPROVED');
      }
    });
  });
}
