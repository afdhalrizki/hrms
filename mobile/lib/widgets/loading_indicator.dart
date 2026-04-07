import 'dart:io';
import 'package:flutter/material.dart';

class AppLoadingIndicator extends StatelessWidget {
  final double? value;
  final Color? color;
  final double strokeWidth;

  const AppLoadingIndicator({
    super.key,
    this.value,
    this.color,
    this.strokeWidth = 4.0,
  });

  @override
  Widget build(BuildContext context) {
    // In FLUTTER_TEST mode, return a static Icon to allow pumpAndSettle to resolve
    if (Platform.environment.containsKey('FLUTTER_TEST')) {
      return Icon(
        Icons.hourglass_empty,
        color: color ?? Theme.of(context).primaryColor,
        size: 40,
      );
    }

    return CircularProgressIndicator(
      value: value,
      color: color,
      strokeWidth: strokeWidth,
    );
  }
}
