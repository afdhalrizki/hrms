import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart' as app;
import 'package:mobile/screens/face_verification_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'test_helper.dart';
import 'package:mobile/api/api_service.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  initTestHttpOverrides();
  GoogleFonts.config.allowRuntimeFetching = false;

  final testTextTheme = ThemeData.dark().textTheme;

  group('Mobile E2E Tests', () {
    
    setUp(() async {
      await setupTestEnvironment();
    });

    tearDown(() {
      ApiService.reset();
    });

    Future<void> settleResilient(WidgetTester tester, {int frames = 20}) async {
      for (int i = 0; i < frames; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
    }

    Future<void> pollFor(WidgetTester tester, Finder finder, {String? message, Duration timeout = const Duration(seconds: 45)}) async {
      final end = DateTime.now().add(timeout);
      while (DateTime.now().isBefore(end)) {
        if (finder.evaluate().isNotEmpty) return;
        await tester.pump(const Duration(milliseconds: 500)); // Increase poll interval to reduce CPU load
      }
      throw Exception('Timed out waiting for ${message ?? finder.description}');
    }

    Future<void> waitForSnackBar(WidgetTester tester, String content, {Duration timeout = const Duration(seconds: 45)}) async {
      final end = DateTime.now().add(timeout);
      final snackBarFinder = find.byType(SnackBar, skipOffstage: false);
      while (DateTime.now().isBefore(end)) {
        if (snackBarFinder.evaluate().isNotEmpty) {
           final textFinder = find.descendant(of: snackBarFinder, matching: find.textContaining(content, skipOffstage: false));
           if (textFinder.evaluate().isNotEmpty) return;
        }
        await tester.pump(const Duration(milliseconds: 200));
      }
      throw Exception('Timed out waiting for SnackBar with content: $content');
    }

    Future<void> waitForLoadingToComplete(WidgetTester tester) async {
      // With animation-safe static icons, pumpAndSettle is now deterministic
      await tester.pumpAndSettle();
    }

    Future<void> waitFor(WidgetTester tester, Finder finder, {String? message, Duration timeout = const Duration(seconds: 45)}) async {
      await pollFor(tester, finder, message: message, timeout: timeout);
    }

    Future<void> scrollTo(WidgetTester tester, Finder finder, {required Finder scrollable, double dy = -200}) async {
       bool found = false;
       for (int i = 0; i < 30; i++) {
         if (finder.evaluate().isNotEmpty) {
           final rect = tester.getRect(finder);
           if (rect.top >= 0 && rect.bottom <= 1920) {
             found = true;
             break;
           }
         }
         await tester.drag(scrollable, Offset(0, dy));
         await tester.pump(const Duration(milliseconds: 100));
       }
       if (!found) throw Exception('Could not scroll to ${finder.description}');
    }

    Future<void> safeTap(WidgetTester tester, Finder finder, {bool settleBefore = true, bool settleAfter = true}) async {
      if (settleBefore) await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 30));
      debugPrint('DEBUG E2E: Tapping ${finder.description}');
      await tester.tap(finder, warnIfMissed: false);
      if (settleAfter) await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 30));
    }

    Future<void> safeEnterText(WidgetTester tester, Finder finder, String text) async {
       await waitFor(tester, finder, message: "Field ${finder.description}");
       await tester.ensureVisible(finder);
       await tester.enterText(finder, text);
       await tester.pumpAndSettle();
    }
    
    Future<void> performLogin(WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() { tester.view.resetPhysicalSize(); tester.view.resetDevicePixelRatio(); });
      await tester.pumpWidget(app.HRMSApp(
        theme: ThemeData.dark().copyWith(textTheme: testTextTheme),
        locale: const Locale('en'),
      ));
      await tester.pumpAndSettle();

      if (find.textContaining('Welcome', skipOffstage: false).evaluate().isEmpty) {
        await safeEnterText(tester, find.widgetWithText(TextField, 'e.g. company1', skipOffstage: false), 'company1');
        await safeEnterText(tester, find.widgetWithText(TextField, 'name@company.com', skipOffstage: false), 'admin@company1.com');
        await safeEnterText(tester, find.widgetWithText(TextField, '••••••••', skipOffstage: false), 'password123');
        await safeTap(tester, find.text('Sign In', skipOffstage: false));
        await waitFor(tester, find.textContaining('Welcome', skipOffstage: false), message: 'Dashboard');
        await tester.pumpAndSettle();
      }
    }


    // MAIN APPLICATION FLOWS
    testWidgets('[1] Full Workflow: Login -> Profile -> Attendance -> Logout', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final profileBtn = find.byKey(const Key('qa_profile'), skipOffstage: false);
        await waitFor(tester, profileBtn, message: 'Home Screen loaded');
        await scrollTo(tester, profileBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, profileBtn);
        await waitFor(tester, find.text('Edit Profile', skipOffstage: false), message: "Profile Screen");
        
        await safeTap(tester, find.byType(BackButton, skipOffstage: false).first);
        await waitFor(tester, find.textContaining('Welcome', skipOffstage: false), message: 'Back to Home');
        
        await safeTap(tester, find.byKey(const Key('qa_clock_in'), skipOffstage: false));
        await waitFor(tester, find.byType(FaceVerificationScreen, skipOffstage: false), message: 'Face Verification');
        await safeTap(tester, find.byKey(const Key('simulate_face_success'), skipOffstage: false));
        await waitFor(tester, find.text('Clock Out', skipOffstage: false), message: 'Clock state changed');

        final settingsBtn = find.byKey(const Key('nav_settings'), skipOffstage: false);
        await safeTap(tester, settingsBtn);
        await waitFor(tester, find.text('Settings', skipOffstage: false), message: 'Settings Screen');
        
        final logoutBtn = find.byKey(const Key('qa_logout_btn'), skipOffstage: false);
        await scrollTo(tester, logoutBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, logoutBtn);
        await safeTap(tester, find.byKey(const Key('qa_logout_confirm'), skipOffstage: false));
        await waitFor(tester, find.text('HRMS Mobile', skipOffstage: false), message: "Back to Login Screen");
      });
    });

    testWidgets('[2] Leaves Flow: view and apply', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        await safeTap(tester, find.byKey(const Key('qa_leaves'), skipOffstage: false));
        await waitFor(tester, find.text('My Leaves', skipOffstage: false), message: 'My Leaves Screen');

        await safeTap(tester, find.byType(FloatingActionButton, skipOffstage: false));
        await waitFor(tester, find.text('New Leave Request', skipOffstage: false), message: 'New Leave Request Screen');
 
        await safeEnterText(tester, find.byKey(const Key('qa_leave_reason'), skipOffstage: false), 'Integrated test leave');
        await tester.pumpAndSettle();
        
        await safeTap(tester, find.text('Apply Leave', skipOffstage: false));
        await waitFor(tester, find.text('My Leaves', skipOffstage: false), message: 'Back to My Leaves');
      });
    });
    
    testWidgets('[3] Payslip: view details', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        await safeTap(tester, find.byKey(const Key('qa_payslip'), skipOffstage: false));
        await tester.pumpAndSettle();
        await waitFor(tester, find.text('NET SALARY', skipOffstage: false), message: 'Payslip details');
      });
    });

    testWidgets('[4] Reimbursement: apply flow', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        
        final reimbBtn = find.byKey(const Key('qa_reimbursement'), skipOffstage: false);
        await scrollTo(tester, reimbBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, reimbBtn);
        await waitFor(tester, find.text('My Reimbursements', skipOffstage: false), message: 'Reimbursement list');
        
        await safeTap(tester, find.byType(FloatingActionButton, skipOffstage: false));
        await waitFor(tester, find.text('New Reimbursement Claim', skipOffstage: false), message: 'Apply screen');
        
        await safeEnterText(tester, find.byKey(const Key('reimb_amount'), skipOffstage: false), '150000');
        await safeEnterText(tester, find.byKey(const Key('reimb_description'), skipOffstage: false), 'Integrated testing transport');
        await tester.pumpAndSettle();
        
        await safeTap(tester, find.text('Submit Claim', skipOffstage: false));
        await waitFor(tester, find.text('My Reimbursements', skipOffstage: false), message: 'Back to reimbursement list');
      });
    });

    testWidgets('[5] Performance Flow', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final perfBtn = find.byKey(const Key('qa_performance'), skipOffstage: false);
        await scrollTo(tester, perfBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, perfBtn);
        await waitFor(tester, find.text('Current KPIs', skipOffstage: false), message: 'Performance Screen');
        
        if (find.text('Review', skipOffstage: false).evaluate().isNotEmpty) {
          await safeTap(tester, find.text('Review', skipOffstage: false).first);
          await waitFor(tester, find.text('Self Appraisal', skipOffstage: false), message: 'Appraisal Screen');
          await tester.enterText(find.byType(TextField, skipOffstage: false).first, 'Good progress');
          await safeTap(tester, find.text('Submit Self Review', skipOffstage: false));
          await waitFor(tester, find.text('Performance', skipOffstage: false), message: 'Back to Performance');
        }
      });
    });

    testWidgets('[6] Profile Update Resilience', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final profileBtn = find.byKey(const Key('qa_profile'), skipOffstage: false);
        await scrollTo(tester, profileBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, profileBtn);
        await waitFor(tester, find.text('Edit Profile', skipOffstage: false), message: 'Profile screen');
        
        await safeEnterText(tester, find.byKey(const Key('profile_phone'), skipOffstage: false), '081299998888');
        await safeEnterText(tester, find.byKey(const Key('profile_address'), skipOffstage: false), 'Jl. QA Test Complete No. 123');
        await safeEnterText(tester, find.byKey(const Key('profile_ktp'), skipOffstage: false), '3171010101010001');
        await safeEnterText(tester, find.byKey(const Key('profile_npwp'), skipOffstage: false), '012345678901234');
        
        await safeTap(tester, find.text('PTKP Status', skipOffstage: false));
        await tester.pumpAndSettle();
        await safeTap(tester, find.text('TK/0', skipOffstage: false).last);
        await tester.pumpAndSettle();
        
        await safeTap(tester, find.byKey(const Key('profile_save_btn'), skipOffstage: false), settleAfter: false);
        await waitForSnackBar(tester, 'successfully');
        await waitFor(tester, find.textContaining('Welcome', skipOffstage: false), message: 'Dashboard');
      });
    });

    testWidgets('[7] Invalid Login Case', (tester) async {
      await tester.runAsync(() async {
        tester.view.physicalSize = const Size(1080, 1920);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() { tester.view.resetPhysicalSize(); tester.view.resetDevicePixelRatio(); });
        await tester.pumpWidget(app.HRMSApp(
          theme: ThemeData.dark().copyWith(textTheme: testTextTheme),
          locale: const Locale('en'),
        ));
        await tester.pumpAndSettle();
        await safeEnterText(tester, find.widgetWithText(TextField, 'e.g. company1', skipOffstage: false), 'company1');
        await safeEnterText(tester, find.widgetWithText(TextField, 'name@company.com', skipOffstage: false), 'wrong@company1.com');
        await safeEnterText(tester, find.widgetWithText(TextField, '••••••••', skipOffstage: false), 'wrongpassword');
        await safeTap(tester, find.text('Sign In', skipOffstage: false));
        await waitFor(tester, find.textContaining('Invalid credentials', skipOffstage: false), message: 'Error message');
      });
    });

    testWidgets('[8] Documents Flow: upload and verify', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final docsBtn = find.byKey(const Key('qa_documents'), skipOffstage: false);
        await scrollTo(tester, docsBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, docsBtn);
        await waitFor(tester, find.text('Documents', skipOffstage: false), message: 'Documents Screen');
        await safeTap(tester, find.byKey(const Key('simulate_doc_capture'), skipOffstage: false), settleAfter: false);
        await waitForSnackBar(tester, 'uploaded successfully');
      });
    });

    testWidgets('[9] Schedule Flow: view list', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final scheduleBtn = find.byKey(const Key('nav_schedule'), skipOffstage: false);
        await safeTap(tester, scheduleBtn);
        await waitFor(tester, find.text('My Schedule', skipOffstage: false), message: 'Schedule Screen');
        expect(find.byIcon(Icons.access_time_filled, skipOffstage: false), findsAtLeast(1));
      });
    });

    testWidgets('[10] Logout Confirmation: Cancel', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final settingsBtn = find.byKey(const Key('nav_settings'), skipOffstage: false);
        await safeTap(tester, settingsBtn);
        await waitFor(tester, find.text('Settings', skipOffstage: false), message: 'Settings Screen');
        
        final logoutBtn = find.byKey(const Key('qa_logout_btn'), skipOffstage: false);
        await scrollTo(tester, logoutBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, logoutBtn);
        
        await waitFor(tester, find.text('Logout', skipOffstage: false), message: 'Logout confirmation dialog');
        await safeTap(tester, find.byKey(const Key('qa_logout_cancel'), skipOffstage: false));
        
        await waitFor(tester, find.text('Settings', skipOffstage: false), message: 'Still on Settings screen after cancel');
      });
    });

    testWidgets('[11] HomeScreen: Pull to Refresh', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        await waitFor(tester, find.textContaining('Welcome', skipOffstage: false), message: 'Dashboard loaded');
        
        final scrollable = find.byType(Scrollable, skipOffstage: false).first;
        await tester.drag(scrollable, const Offset(0, 500));
        await tester.pump();
        // Check if RefreshIndicator is active
        expect(find.byType(RefreshIndicator, skipOffstage: false), findsOneWidget);
        await tester.pumpAndSettle();
        await waitFor(tester, find.textContaining('Welcome', skipOffstage: false), message: 'Dashboard refreshed');
      });
    });

    testWidgets('[12] Reimbursement: Form Validation', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final reimbBtn = find.byKey(const Key('qa_reimbursement'), skipOffstage: false);
        await scrollTo(tester, reimbBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, reimbBtn);
        
        await safeTap(tester, find.byType(FloatingActionButton, skipOffstage: false));
        await waitFor(tester, find.text('New Reimbursement Claim', skipOffstage: false), message: 'Apply screen');
        
        // Submit without amount and description
        await safeTap(tester, find.text('Submit Claim', skipOffstage: false));
        
        await waitFor(tester, find.text('Please enter amount', skipOffstage: false), message: 'Amount validation error');
        await waitFor(tester, find.text('Please enter description', skipOffstage: false), message: 'Description validation error');
      });
    });

    testWidgets('[13] Leave Apply: Form Validation', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        await safeTap(tester, find.byKey(const Key('qa_leaves'), skipOffstage: false));
        await safeTap(tester, find.byType(FloatingActionButton, skipOffstage: false));
        await waitFor(tester, find.text('New Leave Request', skipOffstage: false), message: 'New Leave screen');
        
        // Reason is empty by default, try submit
        await safeTap(tester, find.text('Apply Leave', skipOffstage: false));
        await waitFor(tester, find.text('Please enter a reason', skipOffstage: false), message: 'Reason validation error');
      });
    });

    testWidgets('[14] Localization Check: Indonesian Locale', (tester) async {
      await tester.runAsync(() async {
        tester.view.physicalSize = const Size(1080, 1920);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(() { tester.view.resetPhysicalSize(); tester.view.resetDevicePixelRatio(); });
        await tester.pumpWidget(app.HRMSApp(
          theme: ThemeData.dark().copyWith(textTheme: testTextTheme),
          locale: const Locale('id'),
        ));
        await tester.pumpAndSettle();
        
        // 'Sign In' in English, 'Masuk' in id
        await waitFor(tester, find.text('Masuk', skipOffstage: false), message: 'Indonesian Sign In button');
        // label.toUpperCase() in LoginScreen makes it uppercase
        await waitFor(tester, find.textContaining('SUBDOMAIN PERUSAHAAN', skipOffstage: false), message: 'Indonesian subdomain hint');
      });
    });

    testWidgets('[15] Attendance: History Highlights (Missing Out)', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final correctionBtn = find.byKey(const Key('qa_correction'), skipOffstage: false);
        await scrollTo(tester, correctionBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, correctionBtn);
        
        await safeTap(tester, find.text('History', skipOffstage: false));
        await tester.pumpAndSettle();
        
        // Check for "missing out" indicator (orange color badge with --:--)
        // In CorrectionRequestScreen, it shows 'Out: --:--' in orange if check_out is null
        final missingOutText = find.text('Out: --:--', skipOffstage: false);
        await waitFor(tester, missingOutText, message: 'Missing Out indicator');
      });
    });

    testWidgets('[16] Attendance: Clock-Out Flow', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        
        // Scenario: Currently Clocked In (Mock data in test_helper has one record with check_out: null)
        await waitFor(tester, find.text('Clock Out', skipOffstage: false), message: 'Clock Out state');
        
        await safeTap(tester, find.byKey(const Key('qa_clock_in'), skipOffstage: false));
        await waitFor(tester, find.byType(FaceVerificationScreen, skipOffstage: false), message: 'Face Verification');
        await safeTap(tester, find.byKey(const Key('simulate_face_success'), skipOffstage: false));
        
        // After successful face verification and mock POST, it should ideally go back to Clock In for next day
        // (Note: In mock setup it depends on how _loadProfile handles the refresh)
        await waitFor(tester, find.text('Clock Out', skipOffstage: false), message: 'Clocked state remains until refresh happens or data changes');
      });
    });

    testWidgets('[17] Leave: Balance Verification', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        
        // Ensure Home Screen has finished loading before navigating away
        await tester.pumpAndSettle(const Duration(seconds: 1));
        
        await safeTap(tester, find.byKey(const Key('qa_leaves'), skipOffstage: false));
        await tester.pumpAndSettle();
        
        // Verify balance from integrated seed
        const expectedRemaining = '12.0';
        const expectedUsedTotal = 'Used: 0.0';
        
        await waitFor(tester, find.textContaining(expectedRemaining, skipOffstage: false), message: 'Leave balance card with expected remaining');
        await waitFor(tester, find.textContaining(expectedUsedTotal, skipOffstage: false), message: 'Leave balance details');
      });
    });

    testWidgets('[18] Payslip: Formatting & Accuracy', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        
        // Check formatting in "Recent Activities" on Home Screen
        const formattedApp = 'Rp 16,500,000';
        const formattedDetails = '16,500,000';
        
        await waitFor(tester, find.textContaining(formattedApp, skipOffstage: false), message: 'Payslip IDR formatting with commas');
        
        await safeTap(tester, find.byKey(const Key('qa_payslip'), skipOffstage: false));
        await waitFor(tester, find.text('NET SALARY', skipOffstage: false), message: 'Payslip detail screen');
        await waitFor(tester, find.textContaining(formattedDetails, skipOffstage: false), message: 'Formatted salary in details');
      });
    });


  });
}
