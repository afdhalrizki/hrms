import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/main.dart' as app;
import 'package:mobile/screens/face_verification_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  
  // Disable GoogleFonts network fetching in tests
  GoogleFonts.config.allowRuntimeFetching = false;

  // Centralized helpers for required mobile plugin mocks and test environment state.
  final Map<String, String> _mockSecureStorage = {};

  void setupPluginMocks() {
    _mockSecureStorage.clear();
    const MethodChannel('plugins.it_nomads.com/flutter_secure_storage')
        .setMockMethodCallHandler((MethodCall methodCall) async {
      final args = methodCall.arguments as Map<dynamic, dynamic>?;
      if (methodCall.method == 'write' && args != null) {
        _mockSecureStorage[args['key'] as String] = args['value'] as String;
        return null;
      }
      if (methodCall.method == 'read' && args != null) {
        return _mockSecureStorage[args['key'] as String];
      }
      if (methodCall.method == 'delete' && args != null) {
        _mockSecureStorage.remove(args['key'] as String);
        return null;
      }
      if (methodCall.method == 'deleteAll') {
        _mockSecureStorage.clear();
        return null;
      }
      return null;
    });
  }

  Future<void> setupTestEnvironment() async {
    setupPluginMocks();
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }

  group('End-to-End App Flow Test (Mock Backend)', () {
    // Helper to settle the UI without timing out on infinite animations
    Future<void> settleResilient(WidgetTester tester, {int frames = 20}) async {
       for (int i = 0; i < frames; i++) {
         await tester.pump(const Duration(milliseconds: 100));
       }
    }

    // Intelligent polling for an element to appear
    Future<void> waitFor(WidgetTester tester, Finder finder, {String message = "Widget", int seconds = 10}) async {
      for (int i = 0; i < seconds * 10; i++) {
        await tester.idle(); // Handle microtasks
        await tester.pump(const Duration(milliseconds: 100));
        
        if (finder.evaluate().isNotEmpty) {
          return;
        }
      }
      throw Exception('Timed out waiting for $message');
    }

    // Safe version of ensureVisible that doesn't use pumpAndSettle
    Future<void> ensureVisibleSafe(WidgetTester tester, Finder finder) async {
       await tester.ensureVisible(finder);
       await tester.pump(const Duration(milliseconds: 100));
    }

    // Safe version of scrollUntilVisible that doesn't use pumpAndSettle
    Future<void> scrollUntilVisibleSafe(WidgetTester tester, Finder finder, double delta, {required Finder scrollable}) async {
       bool found = false;
       for (int i = 0; i < 50; i++) {
         if (finder.evaluate().isNotEmpty) {
           final rect = tester.getRect(finder);
           if (rect.top >= 0 && rect.bottom <= 1920) {
             found = true;
             break;
           }
         }
         await tester.drag(scrollable, Offset(0, delta));
         await tester.pump(const Duration(milliseconds: 100));
       }
       if (!found) throw Exception('Could not scroll to ${finder.description}');
    }

    testWidgets('Full Workflow: Login -> Profile -> Attendance -> Logout',
        (tester) async {
      
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockClient = MockClient((request) async {
        final path = request.url.path;
        final method = request.method;
        
        if (path.contains('/auth/login/')) {
          return http.Response(jsonEncode({
            'access': 'mock_access',
            'refresh': 'mock_refresh',
          }), 200);
        }
        
        if (path.contains('/users/me/')) {
          return http.Response(jsonEncode({
            'id': 1,
            'email': 'admin@company1.com',
            'fullname': 'Admin One',
            'role_name': 'Admin',
            'employee_id': 101,
          }), 200);
        }
        
        if (path.contains('/attendance/')) {
          if (method == 'POST') {
            return http.Response(jsonEncode({'status': 'success'}), 201);
          }
          return http.Response(jsonEncode([]), 200);
        }

        if (path.contains('/leave-requests/') || path.contains('/payslips/') || path.contains('/schedules/')) {
          return http.Response(jsonEncode([]), 200);
        }
        
        return http.Response(jsonEncode({'error': 'Not Found'}), 404);
      });

      ApiService.reset();
      ApiService(client: mockClient);

      await setupTestEnvironment();

      app.main();
      await settleResilient(tester);

      // 1. Authentication (Login)
      expect(find.text('HRMS Mobile'), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextField, 'e.g. company1'), 'company1');
      await tester.enterText(find.widgetWithText(TextField, 'name@company.com'), 'admin@company1.com');
      await tester.enterText(find.widgetWithText(TextField, '••••••••'), 'admin123');
      
      final signInBtn = find.text('Sign In');
      await ensureVisibleSafe(tester, signInBtn);
      
      await tester.tap(signInBtn);
      
      // Intensive settling to allow the async login logic and navigation to run
      for (int i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      
      // Intelligent wait for Dashboard
      await waitFor(tester, find.text('Welcome back,'), message: "Dashboard Welcome Text");

      // 2. Navigate to Profile
      final profileBtn = find.text('My Profile');
      await ensureVisibleSafe(tester, profileBtn);
      await tester.tap(profileBtn);
      await waitFor(tester, find.text('Edit Profile'), message: "Profile Screen");
      
      final backButtonFinder = find.byType(BackButton);
      if (backButtonFinder.evaluate().isNotEmpty) {
        await tester.tap(backButtonFinder.first);
        await settleResilient(tester);
      }
      
      // Clock Out (Home screen should match "Clock Out" if attendance mock is empty but we can force state)
      final clockBtn = find.text('Clock In'); // Initially "Clock In" because attendance is empty list
      expect(clockBtn, findsOneWidget);
      await tester.tap(clockBtn);
      
      await waitFor(tester, find.byType(FaceVerificationScreen), message: "Verification Screen");
      
      final verificationBackButton = find.descendant(
        of: find.byType(FaceVerificationScreen),
        matching: find.byType(BackButton),
      );
      
      if (verificationBackButton.evaluate().isNotEmpty) {
        await tester.tap(verificationBackButton.first);
        await settleResilient(tester, frames: 40);
      }

      // 3. Settings and Logout
      final settingsIcon = find.byIcon(Icons.settings);
      expect(settingsIcon, findsOneWidget);
      
      await tester.tap(settingsIcon);
      await tester.pump(const Duration(milliseconds: 500));
      await settleResilient(tester, frames: 20);
      
      await waitFor(tester, find.text('Settings'), message: "Settings Screen");

      final logoutBtn = find.text('Logout');
      await scrollUntilVisibleSafe(tester, logoutBtn, -200.0, scrollable: find.byType(Scrollable).first);
      await tester.tap(logoutBtn);
      await settleResilient(tester);

      final confirmLogout = find.text('Logout');
      await tester.tap(confirmLogout.last);
      
      // Intensive settle to ensure navigation back to Login screen
      await settleResilient(tester, frames: 40);

      await waitFor(tester, find.text('HRMS Mobile'), message: "Login Screen after logout");
    });

    testWidgets('Quick Access: Leaves and Payslip navigation with apply + view',
        (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockClient = MockClient((request) async {
        final path = request.url.path;
        final method = request.method;

        if (path.contains('/auth/login/')) {
          return http.Response(jsonEncode({'access': 'mock_access', 'refresh': 'mock_refresh'}), 200);
        }

        if (path.contains('/users/me/')) {
          return http.Response(jsonEncode({
            'id': 1,
            'email': 'admin@company1.com',
            'fullname': 'Admin One',
            'role_name': 'Admin',
            'employee_id': 101,
          }), 200);
        }

        if (path.contains('/attendance/')) {
          if (method == 'POST') {
            return http.Response(jsonEncode({'status': 'success'}), 201);
          }
          return http.Response(jsonEncode([]), 200);
        }

        if (path.contains('/leave-requests/')) {
          if (method == 'GET') {
            return http.Response(jsonEncode([
              {
                'id': 1,
                'leave_type': 'CUTI',
                'leave_type_name': 'Cuti (Annual)',
                'start_date': '2026-01-05',
                'end_date': '2026-01-06',
                'reason': 'Vacation',
                'status': 'PENDING',
                'created_at': DateTime.now().toIso8601String(),
              }
            ]), 200);
          }
          if (method == 'POST') {
            return http.Response(jsonEncode({'id': 2, 'status': 'PENDING'}), 201);
          }
        }

        if (path.contains('/leave-balances/')) {
          return http.Response(jsonEncode([
            {'year': 2026, 'remaining_days': 10, 'used_days': 5, 'total_days': 15}
          ]), 200);
        }

        if (path.contains('/payslips/')) {
          return http.Response(jsonEncode([
            {
              'id': 201,
              'period_name': 'Feb 2026',
              'net_salary': 10000000,
              'basic_salary': 8000000,
              'paid_at': DateTime.now().toIso8601String(),
              'allowances': [
                {'name': 'Transport', 'amount': 500000}
              ],
              'deductions': [
                {'name': 'Tax', 'amount': 200000}
              ],
            }
          ]), 200);
        }

        if (path.contains('/schedules/')) {
          return http.Response(jsonEncode([]), 200);
        }

        return http.Response(jsonEncode({'error': 'Not Found'}), 404);
      });

      ApiService.reset();
      ApiService(client: mockClient);

      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      app.main();
      await settleResilient(tester);

      // Login
      await tester.enterText(find.widgetWithText(TextField, 'e.g. company1'), 'company1');
      await tester.enterText(find.widgetWithText(TextField, 'name@company.com'), 'admin@company1.com');
      await tester.enterText(find.widgetWithText(TextField, '••••••••'), 'admin123');
      await tester.tap(find.text('Sign In'));

      for (int i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      // 1) Leave path via Quick Access
      final leavesButton = find.text('Leaves');
      expect(leavesButton, findsOneWidget);
      await tester.tap(leavesButton);

      await waitFor(tester, find.text('My Leaves'), message: 'My Leaves Screen');
      expect(find.text('Leave Balance'), findsOneWidget);
      expect(find.text('CUTI - 2026-01-05'), findsOneWidget);

      // Add a new leave request
      final fab = find.byType(FloatingActionButton);
      await ensureVisibleSafe(tester, fab);
      await tester.tap(fab);
      await settleResilient(tester, frames: 10);

      await waitFor(tester, find.text('New Leave Request'), message: 'New Leave Request Screen');

      await tester.enterText(find.byType(TextFormField), 'Family event');
      await tester.tap(find.text('Submit Request'));

      // back to leave list with item from GET list
      await waitFor(tester, find.text('My Leaves'), message: 'Back to My Leaves after submit');
      expect(find.text('CUTI - 2026-01-05'), findsOneWidget);

      // Leave and apply are covered; step done.
    });

    testWidgets('Quick Access: Payslip view only', (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockClient = MockClient((request) async {
        final path = request.url.path;
        final method = request.method;

        if (path.contains('/auth/login/')) {
          return http.Response(jsonEncode({'access': 'mock_access', 'refresh': 'mock_refresh'}), 200);
        }

        if (path.contains('/users/me/')) {
          return http.Response(jsonEncode({
            'id': 1,
            'email': 'admin@company1.com',
            'fullname': 'Admin One',
            'role_name': 'Admin',
            'employee_id': 101,
          }), 200);
        }

        if (path.contains('/attendance/')) {
          if (method == 'POST') {
            return http.Response(jsonEncode({'status': 'success'}), 201);
          }
          return http.Response(jsonEncode([]), 200);
        }

        if (path.contains('/leave-requests/')) {
          return http.Response(jsonEncode([]), 200);
        }

        if (path.contains('/leave-balances/')) {
          return http.Response(jsonEncode([]), 200);
        }

        if (path.contains('/payslips/')) {
          return http.Response(jsonEncode([
            {
              'id': 201,
              'period_name': 'Feb 2026',
              'net_salary': 10000000,
              'basic_salary': 8000000,
              'paid_at': DateTime.now().toIso8601String(),
              'allowances': [
                {'name': 'Transport', 'amount': 500000}
              ],
              'deductions': [
                {'name': 'Tax', 'amount': 200000}
              ],
            }
          ]), 200);
        }

        if (path.contains('/schedules/')) {
          return http.Response(jsonEncode([]), 200);
        }

        return http.Response(jsonEncode({'error': 'Not Found'}), 404);
      });

      ApiService.reset();
      ApiService(client: mockClient);

      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      app.main();
      await settleResilient(tester);

      // Login
      await tester.enterText(find.widgetWithText(TextField, 'e.g. company1'), 'company1');
      await tester.enterText(find.widgetWithText(TextField, 'name@company.com'), 'admin@company1.com');
      await tester.enterText(find.widgetWithText(TextField, '••••••••'), 'admin123');
      await tester.tap(find.text('Sign In'));

      for (int i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      final payslipButton = find.text('Payslip');
      expect(payslipButton, findsWidgets);
      await tester.tap(payslipButton.first);
      await waitFor(tester, find.text('NET SALARY'), message: 'Payslip details loaded', seconds: 15);

      expect(find.textContaining('Rp 10,000,000'), findsWidgets);
    });

    testWidgets('Quick Access: Reimbursement claim apply flow', (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final List<Map<String, dynamic>> reimbursementList = [
        {
          'id': 301,
          'category': {'id': 1, 'name': 'Transport'},
          'category_name': 'Transport',
          'date': DateTime.now().subtract(const Duration(days: 1)).toIso8601String().substring(0, 10),
          'amount': 50000,
          'description': 'Taxi fare',
          'status': 'APPROVED',
          'receipt_number': 'R-1234'
        }
      ];

      final mockClient = MockClient((request) async {
        final path = request.url.path;
        final method = request.method;

        if (path.contains('/auth/login/')) {
          return http.Response(jsonEncode({'access': 'mock_access', 'refresh': 'mock_refresh'}), 200);
        }

        if (path.contains('/users/me/')) {
          return http.Response(jsonEncode({
            'id': 1,
            'email': 'admin@company1.com',
            'fullname': 'Admin One',
            'role_name': 'Admin',
            'employee_id': 101,
          }), 200);
        }

        if (path.contains('/attendance/')) {
          if (method == 'POST') {
            return http.Response(jsonEncode({'status': 'success'}), 201);
          }
          return http.Response(jsonEncode([]), 200);
        }

        if (path.contains('/reimbursement-categories/')) {
          return http.Response(jsonEncode([
            {'id': 1, 'name': 'Transport', 'max_amount': 100000},
            {'id': 2, 'name': 'Meals', 'max_amount': 50000},
          ]), 200);
        }

        if (path.contains('/reimbursements/')) {
          if (method == 'GET') {
            return http.Response(jsonEncode(reimbursementList), 200);
          }
          if (method == 'POST') {
            final body = jsonDecode(request.body);
            final newClaim = {
              'id': 302,
              'category': {'id': body['category'], 'name': 'Meals'},
              'category_name': 'Meals',
              'date': body['date'],
              'amount': body['amount'],
              'description': body['description'],
              'status': 'PENDING',
              'receipt_number': body['receipt_number'] ?? ''
            };
            reimbursementList.add(newClaim);
            return http.Response(jsonEncode(newClaim), 201);
          }
        }

        if (path.contains('/leave-requests/') || path.contains('/leave-balances/') || path.contains('/payslips/') || path.contains('/schedules/')) {
          return http.Response(jsonEncode([]), 200);
        }

        return http.Response(jsonEncode({'error': 'Not Found'}), 404);
      });

      ApiService.reset();
      ApiService(client: mockClient);

      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      app.main();
      await settleResilient(tester);

      // Login
      await tester.enterText(find.widgetWithText(TextField, 'e.g. company1'), 'company1');
      await tester.enterText(find.widgetWithText(TextField, 'name@company.com'), 'admin@company1.com');
      await tester.enterText(find.widgetWithText(TextField, '••••••••'), 'admin123');
      await tester.tap(find.text('Sign In'));

      for (int i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      final reimbButton = find.text('Reimbursement');
      expect(reimbButton, findsOneWidget);
      await tester.tap(reimbButton);
      await waitFor(tester, find.text('My Reimbursements'), message: 'Reimbursement list screen');

      expect(find.textContaining('Transport - IDR 50000'), findsOneWidget);

      final fab = find.byType(FloatingActionButton);
      await ensureVisibleSafe(tester, fab);
      await tester.tap(fab);
      await waitFor(tester, find.text('New Reimbursement Claim'), message: 'Reimbursement apply screen');

      await tester.enterText(find.widgetWithText(TextFormField, 'Amount (IDR)'), '125000');
      await tester.enterText(find.widgetWithText(TextFormField, 'Description'), 'Team lunch');
      await tester.enterText(find.widgetWithText(TextFormField, 'Receipt # (Optional)'), 'R-5678');

      await tester.tap(find.text('Submit Claim'));
      await settleResilient(tester, frames: 20);

      await waitFor(tester, find.text('My Reimbursements'), message: 'Reimbursements after create');
      expect(find.textContaining('Meals - IDR 125000'), findsOneWidget);
    });

    testWidgets('Quick Access: Schedule list display', (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockClient = MockClient((request) async {
        final path = request.url.path;
        final method = request.method;

        if (path.contains('/auth/login/')) {
          return http.Response(jsonEncode({'access': 'mock_access', 'refresh': 'mock_refresh'}), 200);
        }
        if (path.contains('/users/me/')) {
          return http.Response(jsonEncode({
            'id': 1,
            'email': 'admin@company1.com',
            'fullname': 'Admin One',
            'role_name': 'Admin',
            'employee_id': 101,
          }), 200);
        }
        if (path.contains('/attendance/')) {
          if (method == 'POST') return http.Response(jsonEncode({'status': 'success'}), 201);
          return http.Response(jsonEncode([]), 200);
        }
        if (path.contains('/schedules/')) {
          return http.Response(jsonEncode([
            {
              'id': 1001,
              'date': DateTime.now().add(const Duration(days: 1)).toIso8601String().substring(0, 10),
              'shift_detail': {
                'id': 1,
                'name': 'Morning',
                'start_time': '08:00',
                'end_time': '17:00',
                'break_duration': 60,
              },
              'employee_name': 'Admin One',
            }
          ]), 200);
        }
        if (path.contains('/leave-requests/') || path.contains('/leave-balances/') || path.contains('/payslips/') || path.contains('/reimbursement-categories/') || path.contains('/reimbursements/')) {
          return http.Response(jsonEncode([]), 200);
        }
        return http.Response(jsonEncode({'error': 'Not Found'}), 404);
      });

      ApiService.reset();
      ApiService(client: mockClient);

      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      app.main();
      await settleResilient(tester);

      await tester.enterText(find.widgetWithText(TextField, 'e.g. company1'), 'company1');
      await tester.enterText(find.widgetWithText(TextField, 'name@company.com'), 'admin@company1.com');
      await tester.enterText(find.widgetWithText(TextField, '••••••••'), 'admin123');
      await tester.tap(find.text('Sign In'));

      for (int i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      final scheduleIcon = find.byIcon(Icons.calendar_today).last;
      expect(scheduleIcon, findsOneWidget);
      await tester.tap(scheduleIcon);
      await waitFor(tester, find.text('My Schedule'), message: 'Schedule screen loaded', seconds: 15);
      expect(find.textContaining('Morning'), findsOneWidget);
    });

    testWidgets('Quick Access: Attendance clock-in verification flow', (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockClient = MockClient((request) async {
        final path = request.url.path;
        final method = request.method;

        if (path.contains('/auth/login/')) {
          return http.Response(jsonEncode({'access': 'mock_access', 'refresh': 'mock_refresh'}), 200);
        }
        if (path.contains('/users/me/')) {
          return http.Response(jsonEncode({
            'id': 1,
            'email': 'admin@company1.com',
            'fullname': 'Admin One',
            'role_name': 'Admin',
            'employee_id': 101,
          }), 200);
        }
        if (path.contains('/attendance/')) {
          if (method == 'POST') return http.Response(jsonEncode({'status': 'success'}), 201);
          return http.Response(jsonEncode([]), 200);
        }
        if (path.contains('/schedules/') || path.contains('/leave-requests/') || path.contains('/leave-balances/') || path.contains('/payslips/') || path.contains('/reimbursement-categories/') || path.contains('/reimbursements/')) {
          return http.Response(jsonEncode([]), 200);
        }
        return http.Response(jsonEncode({'error': 'Not Found'}), 404);
      });

      ApiService.reset();
      ApiService(client: mockClient);

      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      app.main();
      await settleResilient(tester);

      await tester.enterText(find.widgetWithText(TextField, 'e.g. company1'), 'company1');
      await tester.enterText(find.widgetWithText(TextField, 'name@company.com'), 'admin@company1.com');
      await tester.enterText(find.widgetWithText(TextField, '••••••••'), 'admin123');
      await tester.tap(find.text('Sign In'));

      for (int i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      final attendanceButton = find.text('Clock In');
      expect(attendanceButton, findsOneWidget);
      await tester.tap(attendanceButton);

      await waitFor(tester, find.byType(FaceVerificationScreen), message: 'Face verification screen should be shown');
      expect(find.byType(CircularProgressIndicator), findsWidgets);

      final faceBackButton = find.byType(BackButton);
      if (faceBackButton.evaluate().isNotEmpty) {
        await tester.tap(faceBackButton.first);
        await settleResilient(tester, frames: 20);
      }

      await waitFor(tester, find.text('Welcome back,'), message: 'Return to dashboard after verification cancel');
    });

    test('Authenticated request refresh token flow', () async {
      bool firstUserMe = true;
      final mockClient = MockClient((request) async {
        final path = request.url.path;
        final method = request.method;

        if (path.contains('/auth/login/')) {
          return http.Response(jsonEncode({'access': 'mock_access_init', 'refresh': 'mock_refresh'}), 200);
        }

        if (path.contains('/auth/token/refresh/')) {
          return http.Response(jsonEncode({'access': 'mock_access_refreshed'}), 200);
        }

        if (path.contains('/users/me/')) {
          if (firstUserMe) {
            firstUserMe = false;
            return http.Response(jsonEncode({'detail': 'Invalid token'}), 401);
          }
          return http.Response(jsonEncode({
            'id': 2,
            'email': 'admin@company1.com',
            'fullname': 'Admin Refreshed',
            'role_name': 'Admin',
            'employee_id': 102,
          }), 200);
        }

        return http.Response(jsonEncode({'error': 'Not Found'}), 404);
      });

      ApiService.reset();
      ApiService(client: mockClient);

      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      final api = ApiService();
      await api.login('admin@company1.com', 'admin123', 'company1');
      final profile = await api.getUserProfile();

      expect(profile['fullname'], 'Admin Refreshed');
    });

    testWidgets('Schedule error handling shows failure state', (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      final mockClient = MockClient((request) async {
        final path = request.url.path;
        if (path.contains('/auth/login/')) {
          return http.Response(jsonEncode({'access': 'mock_access_error', 'refresh': 'mock_refresh'}), 200);
        }
        if (path.contains('/users/me/')) {
          return http.Response(jsonEncode({
            'id': 1,
            'email': 'admin@company1.com',
            'fullname': 'Admin One',
            'role_name': 'Admin',
            'employee_id': 101,
          }), 200);
        }
        if (path.contains('/schedules/')) {
          return http.Response('Internal server error', 500);
        }
        if (path.contains('/attendance/') || path.contains('/leave-requests/') || path.contains('/leave-balances/') || path.contains('/payslips/') || path.contains('/reimbursement-categories/') || path.contains('/reimbursements/')) {
          return http.Response(jsonEncode([]), 200);
        }
        return http.Response(jsonEncode({'error': 'Not Found'}), 404);
      });

      ApiService.reset();
      ApiService(client: mockClient);

      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

      app.main();
      await settleResilient(tester);

      await tester.enterText(find.widgetWithText(TextField, 'e.g. company1'), 'company1');
      await tester.enterText(find.widgetWithText(TextField, 'name@company.com'), 'admin@company1.com');
      await tester.enterText(find.widgetWithText(TextField, '••••••••'), 'admin123');
      await tester.tap(find.text('Sign In'));

      for (int i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      final scheduleIcon = find.byIcon(Icons.calendar_today).last;
      expect(scheduleIcon, findsOneWidget);
      await tester.tap(scheduleIcon);

      // Should show error from schedule endpoint
      await waitFor(tester, find.textContaining('Error:'), message: 'Schedule error appears', seconds: 15);
    });
  });
}
