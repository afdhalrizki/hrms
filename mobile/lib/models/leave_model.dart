class LeaveRequest {
  final int? id;
  final String startDate;
  final String endDate;
  final String leaveType;
  final String reason;
  final String status;
  final String? attachment;

  LeaveRequest({
    this.id,
    required this.startDate,
    required this.endDate,
    required this.leaveType,
    required this.reason,
    this.status = 'PENDING',
    this.attachment,
  });

  factory LeaveRequest.fromJson(Map<String, dynamic> json) {
    return LeaveRequest(
      id: json['id'],
      startDate: json['start_date'],
      endDate: json['end_date'],
      leaveType: json['leave_type'],
      reason: json['reason'],
      status: json['status'],
      attachment: json['attachment'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'start_date': startDate,
      'end_date': endDate,
      'leave_type': leaveType,
      'reason': reason,
    };
  }
}

class LeaveBalance {
  final int year;
  final double totalDays;
  final double usedDays;
  final double remainingDays;

  LeaveBalance({
    required this.year,
    required this.totalDays,
    required this.usedDays,
    required this.remainingDays,
  });

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    return LeaveBalance(
      year: json['year'],
      totalDays: double.tryParse(json['total_days']?.toString() ?? '0') ?? 0.0,
      usedDays: double.tryParse(json['used_days']?.toString() ?? '0') ?? 0.0,
      remainingDays: double.tryParse(json['remaining_days']?.toString() ?? '0') ?? 0.0,
    );
  }
}
