import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/activity_model.dart';
import 'package:mobile/models/leave_model.dart';
import 'package:mobile/models/reimbursement_model.dart';

void main() {
  group('Model serialization and domain logic tests', () {
    test('Activity model can be instantiated correctly', () {
      final now = DateTime.now();
      final activity = Activity(
        title: 'Test',
        subtitle: 'sub',
        time: '12:00',
        icon: Icons.check_circle,
        color: const Color(0xFFFFFFFF),
        timestamp: now,
        type: ActivityType.attendance,
      );

      expect(activity.title, 'Test');
      expect(activity.subtitle, 'sub');
      expect(activity.time, '12:00');
      expect(activity.timestamp, now);
      expect(activity.type, ActivityType.attendance);
    });

    test('LeaveRequest fromJson/toJson roundtrip', () {
      final input = {
        'id': 123,
        'start_date': '2026-04-01',
        'end_date': '2026-04-02',
        'leave_type': 'Annual',
        'reason': 'Vacation',
        'status': 'APPROVED',
      };

      final leave = LeaveRequest.fromJson(input);
      expect(leave.id, 123);
      expect(leave.leaveType, 'Annual');
      expect(leave.status, 'APPROVED');

      final output = leave.toJson();
      expect(output['start_date'], '2026-04-01');
      expect(output['end_date'], '2026-04-02');
      expect(output['leave_type'], 'Annual');
      expect(output['reason'], 'Vacation');
    });

    test('LeaveBalance fromJson conversion', () {
      final input = {
        'year': 2026,
        'total_days': 12,
        'used_days': 3,
        'remaining_days': 9,
      };
      final balance = LeaveBalance.fromJson(input);
      expect(balance.year, 2026);
      expect(balance.totalDays, 12.0);
      expect(balance.usedDays, 3.0);
      expect(balance.remainingDays, 9.0);
    });

    test('ReimbursementCategory: fromJson parses correctly', () {
      final category = ReimbursementCategory.fromJson({'id': 1, 'name': 'Travel', 'max_amount': 400});
      expect(category.id, 1);
      expect(category.name, 'Travel');
      expect(category.maxAmount, 400.0);
    });

    test('Reimbursement: fromJson parses correctly with nested category', () {
      final reimbursement = Reimbursement.fromJson({
        'id': 10,
        'category': {'id': 1, 'name': 'Travel'},
        'category_name': 'Travel',
        'date': '2026-04-01',
        'amount': 125.0,
        'description': 'Taxi fare',
        'status': 'APPROVED',
        'receipt_number': 'R-001',
      });

      expect(reimbursement.id, 10);
      expect(reimbursement.categoryId, 1);
      expect(reimbursement.categoryName, 'Travel');
      expect(reimbursement.amount, 125.0);
      expect(reimbursement.status, 'APPROVED');
    });

    test('Reimbursement: toJson handles category mapping', () {
      final reimbursement = Reimbursement.fromJson({
        'id': 10,
        'category': {'id': 1, 'name': 'Travel'},
        'category_name': 'Travel',
        'date': '2026-04-01',
        'amount': 125.0,
        'description': 'Taxi fare',
        'status': 'APPROVED',
        'receipt_number': 'R-001',
      });
      final json = reimbursement.toJson();
      expect(json['category'], 1);
      expect(json['date'], '2026-04-01');
      expect(json['amount'], 125.0);
      expect(json['description'], 'Taxi fare');
      expect(json['receipt_number'], 'R-001');
    });
  });
}
