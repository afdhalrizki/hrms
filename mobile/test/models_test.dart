import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/models/schedule_model.dart';

void main() {
  group('Model Parsing Tests', () {
    test('Shift.fromJson parses correctly', () {
      final json = {
        'id': 1,
        'name': 'Morning Shift',
        'start_time': '08:00',
        'end_time': '17:00',
        'break_duration': 60
      };

      final shift = Shift.fromJson(json);

      expect(shift.id, 1);
      expect(shift.name, 'Morning Shift');
      expect(shift.startTime, '08:00');
      expect(shift.endTime, '17:00');
      expect(shift.breakDuration, 60);
    });

    test('Shift.fromJson handles missing break_duration with default', () {
      final json = {
        'id': 2,
        'name': 'Night Shift',
        'start_time': '22:00',
        'end_time': '06:00',
      };

      final shift = Shift.fromJson(json);
      expect(shift.breakDuration, 0);
    });

    test('Schedule.fromJson parses correctly with nested shift', () {
      final json = {
        'id': 10,
        'date': '2026-03-20',
        'employee_name': 'Afdhal',
        'shift_detail': {
          'id': 5,
          'name': 'Flexi',
          'start_time': '09:00',
          'end_time': '18:00',
          'break_duration': 30
        }
      };

      final schedule = Schedule.fromJson(json);

      expect(schedule.id, 10);
      expect(schedule.date, '2026-03-20');
      expect(schedule.employeeName, 'Afdhal');
      expect(schedule.shift.name, 'Flexi');
      expect(schedule.shift.startTime, '09:00');
    });
  });
}
