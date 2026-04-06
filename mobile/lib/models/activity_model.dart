import 'package:flutter/material.dart';

enum ActivityType { attendance, leave, payslip, performance }

class Activity {
  final String title;
  final String subtitle;
  final String time;
  final IconData icon;
  final Color color;
  final DateTime timestamp;
  final ActivityType type;

  Activity({
    required this.title,
    required this.subtitle,
    required this.time,
    required this.icon,
    required this.color,
    required this.timestamp,
    required this.type,
  });

  factory Activity.fromJson(Map<String, dynamic> json) {
    return Activity(
      title: json['title'] ?? '',
      subtitle: json['subtitle'] ?? '',
      time: json['time'] ?? '',
      icon: Icons.notifications,
      color: Colors.blue,
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      type: ActivityType.attendance,
    );
  }
}
