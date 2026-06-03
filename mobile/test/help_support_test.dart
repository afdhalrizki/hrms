import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'dart:convert';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/screens/help_support_screen.dart';
import 'package:mobile/screens/ticket_detail_screen.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/api/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'test_helper.dart';

void main() {
  setUp(() async {
    await setupTestEnvironment();
    mockSecureStorage['jwt_token'] = 'mock_access';
    mockSecureStorage['tenant'] = 'company1';
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('tenant_subdomain', 'company1');
    
    ApiService.reset();
    
    // Setup Mock Client for API calls
    final mockClient = MockClient((request) async {
      final url = request.url.toString();
      final method = request.method;
      if (url.contains('/help/guidelines/')) {
        return http.Response(jsonEncode([
          {
            'title': 'Panduan Absensi GPS',
            'description': 'Langkah-langkah melakukan absensi menggunakan GPS presisi.',
            'category': 'ATTENDANCE'
          }
        ]), 200);
      }
      if (url.contains('/internal-tickets/1/')) {
        return http.Response(jsonEncode({
          'id': 1,
          'title': 'Tiket BPJS',
          'description': 'Pertanyaan seputar pemotongan BPJS',
          'category': 'PAYROLL',
          'priority': 'MEDIUM',
          'status': 'OPEN',
          'messages': [
            {
              'id': 1,
              'sender_name': 'Employee One',
              'sender_email': 'employee1@company1.com',
              'message': 'Apakah pemotongan BPJS sudah benar?',
              'created_at': '2026-05-21T00:00:00Z'
            }
          ]
        }), 200);
      }
      if (url.contains('/internal-tickets/')) {
        if (method == 'POST') {
          return http.Response(jsonEncode({
            'id': 2,
            'title': 'Tiket Baru Test',
            'category': 'GENERAL',
            'priority': 'LOW',
            'status': 'OPEN'
          }), 201);
        }
        return http.Response(jsonEncode([
          {
            'id': 1,
            'title': 'Tiket BPJS',
            'category': 'PAYROLL',
            'priority': 'MEDIUM',
            'status': 'OPEN'
          }
        ]), 200);
      }
      return http.Response(jsonEncode({'status': 'success'}), 200);
    });
    ApiService(client: mockClient);
  });

  tearDown(() {
    ApiService.reset();
  });

  testWidgets('HelpSupportScreen renders guidelines and tickets tabs', (WidgetTester tester) async {
    const userData = {
      'fullname': 'Employee One',
      'email': 'employee1@company1.com',
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
        home: HelpSupportScreen(userData: userData),
      ),
    );

    // Initial loading
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verify Title and Tabs
    expect(find.text('Bantuan & Tiket'), findsOneWidget);
    expect(find.text('Panduan'), findsOneWidget);
    expect(find.text('Tiket Saya'), findsOneWidget);

    // Verify Guidelines item
    expect(find.text('Panduan Absensi GPS'), findsOneWidget);

    // Toggle Tab to Tickets
    await tester.tap(find.text('Tiket Saya'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verify Tickets list item
    expect(find.text('Tiket BPJS'), findsOneWidget);
    expect(find.text('OPEN'), findsOneWidget);
  });

  testWidgets('TicketDetailScreen renders and displays message thread', (WidgetTester tester) async {
    const userData = {
      'fullname': 'Employee One',
      'email': 'employee1@company1.com',
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
        home: TicketDetailScreen(ticketId: 1, userData: userData),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verify ticket headers and description
    expect(find.text('Tiket BPJS'), findsOneWidget);
    expect(find.text('Pertanyaan seputar pemotongan BPJS'), findsOneWidget);
    
    // Verify messages thread
    expect(find.text('Apakah pemotongan BPJS sudah benar?'), findsOneWidget);
    expect(find.text('Employee One'), findsOneWidget);
  });

  testWidgets('HelpSupportScreen can create a new ticket', (WidgetTester tester) async {
    const userData = {
      'fullname': 'Employee One',
      'email': 'employee1@company1.com',
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
        home: HelpSupportScreen(userData: userData),
      ),
    );

    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Tap FloatingActionButton to open the create sheet
    final fab = find.byType(FloatingActionButton);
    expect(fab, findsOneWidget);
    await tester.tap(fab);
    await tester.pumpAndSettle();

    // Verify sheet title
    expect(find.text('Buat Tiket Bantuan'), findsOneWidget);

    // Enter subjek / judul
    final titleField = find.widgetWithText(TextField, 'Subjek / Judul Tiket');
    expect(titleField, findsOneWidget);
    await tester.enterText(titleField, 'Tiket Baru Test');

    // Enter deskripsi
    final descField = find.widgetWithText(TextField, 'Deskripsi Detail Masalah');
    expect(descField, findsOneWidget);
    await tester.enterText(descField, 'Deskripsi tiket baru test');

    // Tap Kirim Tiket button
    final submitBtn = find.widgetWithText(ElevatedButton, 'Kirim Tiket');
    expect(submitBtn, findsOneWidget);
    await tester.tap(submitBtn);
    await tester.pumpAndSettle();

    // Verify sheet closed and success SnackBar shown
    expect(find.text('Buat Tiket Bantuan'), findsNothing);
    expect(find.text('Tiket berhasil dibuat'), findsOneWidget);
  });
}
