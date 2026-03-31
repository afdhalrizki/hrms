import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/screens/settings_screen.dart';

void main() {
  testWidgets('SettingsScreen renders and displays profile data', (WidgetTester tester) async {
    const userData = {
      'fullname': 'Test User',
      'email': 'test@example.com',
      'employee_nik': 'EMP123',
    };

    await tester.pumpWidget(
      MaterialApp(
        home: SettingsScreen(userData: userData),
      ),
    );

    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Test User'), findsOneWidget);
    expect(find.text('test@example.com'), findsOneWidget);
    expect(find.text('NIK: EMP123'), findsOneWidget);
    expect(find.text('Logout'), findsOneWidget);
    expect(find.text('Language'), findsOneWidget);
    expect(find.text('Dark Mode'), findsOneWidget);
  });
}
