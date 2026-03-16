class Shift {
  final int id;
  final String name;
  final String startTime;
  final String endTime;
  final int breakDuration;

  Shift({
    required this.id,
    required this.name,
    required this.startTime,
    required this.endTime,
    required this.breakDuration,
  });

  factory Shift.fromJson(Map<String, dynamic> json) {
    return Shift(
      id: json['id'],
      name: json['name'],
      startTime: json['start_time'],
      endTime: json['end_time'],
      breakDuration: json['break_duration'] ?? 0,
    );
  }
}

class Schedule {
  final int id;
  final String date;
  final Shift shift;
  final String employeeName;

  Schedule({
    required this.id,
    required this.date,
    required this.shift,
    required this.employeeName,
  });

  factory Schedule.fromJson(Map<String, dynamic> json) {
    return Schedule(
      id: json['id'],
      date: json['date'],
      shift: Shift.fromJson(json['shift_detail']),
      employeeName: json['employee_name'] ?? '',
    );
  }
}
