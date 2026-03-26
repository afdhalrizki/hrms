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
}
