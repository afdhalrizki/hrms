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
import 'test_helper.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  initTestHttpOverrides();
  
  // Disable GoogleFonts network fetching in tests
  GoogleFonts.config.allowRuntimeFetching = false;

  final testTextTheme = ThemeData.dark().textTheme;

  Future<void> setupTestEnvironment() async {
    await setupMockApiService();
  }

  group('End-to-End App Flow Test (Mock Backend)', () {
    setUp(() async {
      await setupMockApiService();
      // Ensure consistent screen size for tests
      final binding = TestWidgetsFlutterBinding.ensureInitialized();
      binding.platformDispatcher.implicitView!.physicalSize = const Size(1080, 1920);
      binding.platformDispatcher.implicitView!.devicePixelRatio = 1.0;
    });

    tearDown(() {
      final binding = TestWidgetsFlutterBinding.ensureInitialized();
      binding.platformDispatcher.implicitView!.resetPhysicalSize();
    });

    // Helper to settle the UI without timing out on infinite animations
    Future<void> settleResilient(WidgetTester tester, {int frames = 20}) async {
       for (int i = 0; i < frames; i++) {
         await tester.pump(const Duration(milliseconds: 100));
       }
    }

    // Intelligent polling for an element to appear
    Future<void> waitFor(WidgetTester tester, Finder finder, {String message = "Widget", int seconds = 30}) async {
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

      ApiService.reset();
      ApiService(client: getMockClient());

      await setupTestEnvironment();

      await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
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

      
      mockLeaveState['balances'] = [
        {'year': 2026, 'remaining_days': 10, 'used_days': 5, 'total_days': 15}
      ];
      mockLeaveState['requests'] = [
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
      ];

      await loginForTest();

      await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
      await settleResilient(tester);
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      // 1) Leave path via Quick Access
      final leavesButton = find.text('Leaves');
      expect(leavesButton, findsOneWidget);
      await tester.tap(leavesButton);

      await waitFor(tester, find.text('My Leaves'), message: 'My Leaves Screen');
      await waitFor(tester, find.text('Leave Balance'), message: 'Leave Balance loaded');
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

      
      mockPayslipState['payslips'] = [
        {
          'id': 201,
          'period_name': 'Feb 2026',
          'net_salary': 10000000,
          'basic_salary': 8000000,
          'paid_at': DateTime.now().toIso8601String(),
          'allowances': [{'name': 'Transport', 'amount': 500000}],
          'deductions': [{'name': 'Tax', 'amount': 200000}],
        }
      ];

      await loginForTest();

      await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
      await settleResilient(tester);
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

      
      mockReimbursementState['categories'] = [
        {'id': 1, 'name': 'Transport', 'max_amount': 100000},
        {'id': 2, 'name': 'Meals', 'max_amount': 50000},
      ];
      mockReimbursementState['requests'] = [
        {
          'id': 301,
          'category': {'id': 1, 'name': 'Transport'},
          'category_name': 'Transport',
          'date': '2026-03-31',
          'amount': 50000,
          'description': 'Taxi fare',
          'status': 'APPROVED',
          'receipt_number': 'R-1234'
        }
      ];

      await loginForTest();

      await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
      await settleResilient(tester);
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      final reimbButton = find.text('Reimbursement');
      expect(reimbButton, findsOneWidget);
      await tester.tap(reimbButton);
      await waitFor(tester, find.text('My Reimbursements'), message: 'Reimbursement list screen');

      await waitFor(tester, find.textContaining('Transport - IDR 50000'), message: 'Existing reimbursement displayed');

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
    });

    testWidgets('Quick Access: Schedule list display', (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      
      mockScheduleState['schedules'] = [
        {
          'id': 1001,
          'date': '2026-04-02',
          'shift_detail': {
            'id': 1,
            'name': 'Morning',
            'start_time': '08:00',
            'end_time': '17:00',
            'break_duration': 60,
          },
          'employee_name': 'Admin One',
        }
      ];

      await loginForTest();

      await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
      await settleResilient(tester);
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      final scheduleIcon = find.byKey(const Key('nav_schedule'));
      await tester.tap(scheduleIcon);
      await waitFor(tester, find.text('My Schedule'), message: 'Schedule screen loaded', seconds: 15);
      await waitFor(tester, find.textContaining('Morning'), message: 'Schedule item visible');
    });

    testWidgets('Quick Access: Attendance clock-in verification flow', (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      
      await loginForTest();

      await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
      await settleResilient(tester);
      await waitFor(tester, find.text('Welcome back,'), message: 'Dashboard Welcome Text');

      final attendanceButton = find.text('Clock In');
      expect(attendanceButton, findsOneWidget);
      await tester.tap(attendanceButton);

      await waitFor(tester, find.byType(FaceVerificationScreen), message: 'Face verification screen should be shown');
      
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

      // Use the specialized error mock client
      final mockClient = MockClient((request) async {
        final path = request.url.path;
        if (path.contains('/auth/login/')) {
          return http.Response(jsonEncode({'access': 'mock_access_error', 'refresh': 'mock_refresh'}), 200);
        }
        if (path.contains('/users/me/')) {
          return http.Response(jsonEncode({
            'id': 1, 'email': 'admin@company1.com', 'fullname': 'Admin One', 'role_name': 'Admin', 'employee_id': 101,
          }), 200);
        }
        if (path.contains('/schedules/')) {
          return http.Response('Internal server error', 500);
        }
        return http.Response(jsonEncode([]), 200);
      });

      ApiService.reset();
      ApiService(client: mockClient);
      await loginForTest();
      mockSecureStorage['jwt_token'] = 'mock_access_error';

      await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
      await waitFor(tester, find.text('Welcome back,'), message: 'Home Screen loaded');

      final scheduleIcon = find.byKey(const Key('nav_schedule'));
      await tester.tap(scheduleIcon);

      // Should show error from schedule endpoint
      await waitFor(tester, find.textContaining('Error:'), message: 'Schedule error appears', seconds: 15);
    });

    testWidgets('Full Attendance Lifecycle: Clock In -> Clock Out', (tester) async {
        tester.view.physicalSize = const Size(1080, 1920);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        
        await loginForTest();
        mockAttendanceState['activeRecord'] = null; // Start with no session
        
        await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
        await settleResilient(tester);
        await waitFor(tester, find.text('Admin One'), message: 'Home Screen loaded with user name');

        // 1. Clock In
        await waitFor(tester, find.text('Clock In'), message: 'Clock In button');
        await tester.tap(find.text('Clock In'));
        await settleResilient(tester, frames: 10);
        
        await waitFor(tester, find.byType(FaceVerificationScreen), message: 'Face Verification');
        await tester.tap(find.byKey(const Key('simulate_face_success')));
        await settleResilient(tester, frames: 100);
        await tester.pump(const Duration(seconds: 1)); // Extra time for state to propagate
        await tester.pumpAndSettle(); 

        // 2. Change state to Clock Out should have occurred
        await waitFor(tester, find.text('Clock Out'), message: 'Clock Out button appears', seconds: 45); // Increased timeout for clock state sync
        expect(find.text('Clock Out'), findsOneWidget);

        await tester.tap(find.text('Clock Out'));
        await settleResilient(tester, frames: 10);
        await waitFor(tester, find.byType(FaceVerificationScreen), message: 'Face Verification Clock Out');
        await tester.tap(find.byKey(const Key('simulate_face_success')));
        await settleResilient(tester, frames: 100);

        // Successfully back to dashboard
        await waitFor(tester, find.text('Welcome back,'), message: 'Back to Dashboard');
    });

    testWidgets('Attendance Correction Flow: navigate and submit', (tester) async {
        tester.view.physicalSize = const Size(1080, 1920);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        
        await loginForTest();

        mockAttendanceState['records'] = [{
          'id': 1,
          'date': '2026-04-01',
          'check_in': '08:00:00',
          'check_out': null,
        }];
        
        await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
        await settleResilient(tester, frames: 100);

        // Login is bypassed because of loginForTest but we still need to wait for home
        await waitFor(tester, find.text('Welcome back,'), message: 'Home Screen loaded');

        // Navigate to Correction
        final correctionBtn = find.byKey(const Key('qa_correction'));
        await scrollUntilVisibleSafe(tester, correctionBtn, -200.0, scrollable: find.byType(Scrollable).first);
        await tester.tap(correctionBtn);
        await waitFor(tester, find.text('Attendance Correction'), message: 'Correction Screen');

        // Go to History tab
        await tester.tap(find.text('History'));
        await settleResilient(tester);
        
        // Tap on edit icon for the record
        await tester.tap(find.byIcon(Icons.edit_calendar).first);
        await settleResilient(tester);

        await tester.enterText(find.widgetWithText(TextField, 'Reason'), 'Forgot to clock in on time');
        await tester.tap(find.text('Submit Request'));
        await settleResilient(tester, frames: 20);

        // Should return to list
        await waitFor(tester, find.text('Attendance Correction'), message: 'Back to Correction list');
    });

    testWidgets('Performance: KPI view and Self Appraisal submit', (tester) async {
        tester.view.physicalSize = const Size(1080, 1920);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        
        await loginForTest();

        mockKpiState['targets'].clear();
        mockKpiState['targets'].addAll([
          {
            'id': 1,
            'kpi_name': 'Sales',
            'target_value': 100.0,
            'actual_value': 50.0,
            'unit': 'units',
            'deadline': '2026-12-31',
          }
        ]);
        mockAppraisalState['periods'].clear();
        mockAppraisalState['periods'].addAll([
          {
            'id': 1,
            'period_name': 'Q1 2026',
            'start_date': '2026-01-01',
            'end_date': '2026-03-31',
            'status': 'DRAFT',
            'final_score': null,
          }
        ]);
        
        await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
        await settleResilient(tester, frames: 100);
        await waitFor(tester, find.text('Admin One'), message: 'Home Screen loaded with user name');

        // Navigate to Performance
        final perfBtn = find.byKey(const Key('qa_performance'));
        await scrollUntilVisibleSafe(tester, perfBtn, -200.0, scrollable: find.byType(Scrollable).first);
        await tester.tap(perfBtn);
        await settleResilient(tester, frames: 100);
        await waitFor(tester, find.text('Current KPIs'), message: 'Performance Screen Header');
        await tester.pump(const Duration(seconds: 1)); // Wait for API
        await settleResilient(tester, frames: 100);
        
        // Ensure loading is finished
        for (int i = 0; i < 50; i++) {
          if (tester.any(find.byType(CircularProgressIndicator))) {
            await tester.pump(const Duration(milliseconds: 200));
          } else {
            break;
          }
        }
        await tester.pumpAndSettle();

        await waitFor(tester, find.text('Sales'), message: 'KPI Item visible');
        expect(find.text('Sales'), findsOneWidget);
        expect(find.text('Q1 2026'), findsOneWidget);

        // Tap on Review button to fill review
        await tester.tap(find.text('Review'));
        await waitFor(tester, find.text('Self Appraisal'), message: 'Self Appraisal Screen');

        await tester.enterText(find.byType(TextField).first, 'Achievement summary');
        await tester.tap(find.text('Submit Self Review'));
        await settleResilient(tester, frames: 20);

        // Back to Performance list
        await waitFor(tester, find.text('Performance'), message: 'Back to Performance');
    });

    testWidgets('Profile: Update profile information', (tester) async {
        tester.view.physicalSize = const Size(1080, 1920);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.resetPhysicalSize);

        // Redundant setups removed by setUp()
        await loginForTest();
        await tester.pumpWidget(app.HRMSApp(theme: ThemeData.dark().copyWith(textTheme: testTextTheme)));
        await settleResilient(tester, frames: 100); // More time for home load
        await waitFor(tester, find.text('Welcome back,'), message: 'Home Screen loaded');

        // Navigate to Profile
        final profileBtn = find.byKey(const Key('qa_profile'));
        await scrollUntilVisibleSafe(tester, profileBtn, -200.0, scrollable: find.byType(Scrollable).first);
        await tester.tap(profileBtn);
        await waitFor(tester, find.text('Edit Profile'), message: 'Profile Screen');

        await tester.tap(find.text('Edit Profile'));
        await settleResilient(tester);

        await tester.enterText(find.widgetWithText(TextFormField, 'Phone Number'), '08123456789');
        await tester.tap(find.text('Save Changes'));
        await settleResilient(tester, frames: 20);

        // Should show success state and back to profile
        await waitFor(tester, find.text('Edit Profile'), message: 'Back to Profile view');
    });
  });
}
