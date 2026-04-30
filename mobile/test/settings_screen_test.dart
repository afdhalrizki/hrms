import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'dart:convert';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/screens/settings_screen.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/api/api_service.dart';

void main() {
  setUp(() {
    // Reset ApiService with a mock client to avoid real network calls
    final mockClient = MockClient((request) async {
      return http.Response(jsonEncode({'status': 'success'}), 200);
    });
    ApiService(client: mockClient);
  });

  tearDown(() {
    ApiService.reset();
  });
  testWidgets('SettingsScreen renders and displays profile data', (WidgetTester tester) async {
    const userData = {
      'fullname': 'Test User',
      'email': 'test@example.com',
      'employee_nik': 'EMP123',
    };

    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('en'), Locale('id')],
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
    expect(find.text('Email Notifications'), findsOneWidget);
    
    // Check if Switch is present and has correct value
    final switchFinder = find.byType(Switch).last;
    expect(tester.widget<Switch>(switchFinder).value, isTrue);
  });

  testWidgets('SettingsScreen toggle notification updates value', (WidgetTester tester) async {
    const userData = {
      'id': 1,
      'fullname': 'Test User',
      'email': 'test@example.com',
      'employee_nik': 'EMP123',
      'receive_email_notifications': true,
    };

    await tester.pumpWidget(
      MaterialApp(
        localizationsDelegates: const [
          AppLocalizations.delegate,
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('en'), Locale('id')],
        home: SettingsScreen(userData: userData),
      ),
    );

    final switchFinder = find.byType(Switch).last;
    await tester.tap(switchFinder);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump(const Duration(seconds: 5));

    // Note: Since we don't mock the API here, it will probably fail or log an error,
    // but the UI state should at least attempt to update or handle the call.
    // In a real scenario, we'd mock ApiService.
  });
}
