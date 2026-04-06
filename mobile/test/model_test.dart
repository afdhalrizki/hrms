import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/user_model.dart';
import 'package:mobile/models/leave_model.dart';
import 'package:mobile/models/reimbursement_model.dart';
import 'package:mobile/models/schedule_model.dart';
import 'package:mobile/models/activity_model.dart';

void main() {
  group('User Model Tests', () {
    test('User.fromJson creates valid object', () {
      final json = {
        'id': 1,
        'email': 'test@example.com',
        'fullname': 'Test User',
        'role_name': 'Employee',
        'employee_id': 101,
      };
      final user = User.fromJson(json);
      expect(user.id, 1);
      expect(user.email, 'test@example.com');
      expect(user.fullname, 'Test User');
      expect(user.roleName, 'Employee');
      expect(user.employeeId, 101);
    });
  });

  group('Leave Model Tests', () {
    test('LeaveRequest fromJson and toJson', () {
      final json = {
        'id': 1,
        'start_date': '2026-04-01',
        'end_date': '2026-04-02',
        'leave_type': 'ANNUAL',
        'reason': 'Vacation',
        'status': 'APPROVED',
        'attachment': 'url'
      };
      final leave = LeaveRequest.fromJson(json);
      expect(leave.id, 1);
      expect(leave.startDate, '2026-04-01');
      expect(leave.status, 'APPROVED');

      final toMap = leave.toJson();
      expect(toMap['start_date'], '2026-04-01');
      expect(toMap['leave_type'], 'ANNUAL');
    });

    test('LeaveBalance fromJson', () {
      final json = {
        'year': 2026,
        'total_days': 12.0,
        'used_days': 2.0,
        'remaining_days': 10.0
      };
      final balance = LeaveBalance.fromJson(json);
      expect(balance.year, 2026);
      expect(balance.totalDays, 12.0);
      expect(balance.remainingDays, 10.0);
    });
  });

  group('Reimbursement Model Tests', () {
    test('ReimbursementCategory fromJson', () {
      final json = {'id': 1, 'name': 'Travel', 'max_amount': 500.0};
      final cat = ReimbursementCategory.fromJson(json);
      expect(cat.id, 1);
      expect(cat.name, 'Travel');
      expect(cat.maxAmount, 500.0);

      final jsonNoMax = {'id': 2, 'name': 'Food'};
      final cat2 = ReimbursementCategory.fromJson(jsonNoMax);
      expect(cat2.maxAmount, isNull);
    });

    test('Reimbursement fromJson and toJson', () {
      final json = {
        'id': 1,
        'category': {'id': 1, 'name': 'Travel'},
        'category_name': 'Travel',
        'date': '2026-04-01',
        'amount': 150.0,
        'description': 'Taxi',
        'status': 'PENDING',
        'receipt_number': 'REC123'
      };
      final r = Reimbursement.fromJson(json);
      expect(r.id, 1);
      expect(r.amount, 150.0);
      expect(r.categoryName, 'Travel');

      final toMap = r.toJson();
      expect(toMap['amount'], 150.0);
      expect(toMap['category'], 1);
    });

    test('Reimbursement fromJson with int category', () {
      final json = {
        'id': 1,
        'category': 5,
        'date': '2026-04-01',
        'amount': 50.0,
        'description': 'Test',
        'status': 'APPROVED'
      };
      final r = Reimbursement.fromJson(json);
      expect(r.categoryId, 5);
    });
  });

  group('Schedule Model Tests', () {
    test('Schedule fromJson', () {
      final json = {
        'id': 1,
        'date': '2026-04-01',
        'employee_name': 'Test',
        'shift_detail': {
           'id': 10,
           'name': 'Morning',
           'start_time': '08:00',
           'end_time': '16:00',
           'break_duration': 60
        }
      };
      final s = Schedule.fromJson(json);
      expect(s.id, 1);
      expect(s.shift.name, 'Morning');
      expect(s.shift.startTime, '08:00');
    });
  });

  group('Activity Model Tests', () {
    test('Activity fromJson', () {
      final json = {
        'title': 'Attendance',
        'subtitle': 'Clock in success',
        'time': '08:00 AM',
        'timestamp': '2026-04-01T10:00:00Z',
      };
      final a = Activity.fromJson(json);
      expect(a.title, 'Attendance');
    });
  });
}
