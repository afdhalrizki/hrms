import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart' as app;
import 'package:mobile/screens/face_verification_screen.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'test_helper.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  initTestHttpOverrides();
  GoogleFonts.config.allowRuntimeFetching = false;

  final testTextTheme = ThemeData.dark().textTheme;
  const bool isIntegrated = bool.fromEnvironment('INTEGRATED_TEST', defaultValue: false);

  Future<void> setupTestEnvironment() async {
    if (isIntegrated) {
      await setupIntegratedApiService();
    } else {
      await setupMockApiService();
    }
  }

  group(isIntegrated ? 'End-to-End App Flow Test (Real Backend)' : 'End-to-End App Flow Test (Mock Backend)', () {
    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      await setupTestEnvironment();
      final binding = TestWidgetsFlutterBinding.ensureInitialized();
      binding.platformDispatcher.implicitView!.physicalSize = const Size(1080, 1920);
      binding.platformDispatcher.implicitView!.devicePixelRatio = 1.0;
    });

    tearDown(() {
      final binding = TestWidgetsFlutterBinding.ensureInitialized();
      binding.platformDispatcher.implicitView!.resetPhysicalSize();
    });

    Future<void> settleResilient(WidgetTester tester, {int frames = 20}) async {
       for (int i = 0; i < frames; i++) {
         if (isIntegrated) {
           await Future.delayed(const Duration(milliseconds: 50));
         }
         await tester.pump(const Duration(milliseconds: 100));
       }
    }

    Future<void> waitFor(WidgetTester tester, Finder finder, {String? message, Duration timeout = const Duration(seconds: 45)}) async {
      final end = DateTime.now().add(timeout);
      while (DateTime.now().isBefore(end)) {
        if (finder.evaluate().isNotEmpty) return;
        if (isIntegrated) {
           await Future.delayed(const Duration(milliseconds: 50));
        }
        await tester.pump(const Duration(milliseconds: 100));
      }
      throw Exception('Timed out waiting for ${message ?? finder.description}');
    }

    // A helper for robust scrolling that ignores overflow
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

    Future<void> safeTap(WidgetTester tester, Finder finder, {bool settleBefore = true}) async {
      if (settleBefore) await settleResilient(tester, frames: 5); // Wait for micro-animations
      if (finder.evaluate().isEmpty) {
        throw Exception("safeTap failed: ${finder.description} not found in widget tree");
      }
      try {
        await tester.ensureVisible(finder);
        await tester.pump(const Duration(milliseconds: 100));
      } catch (e) {
        // ignore if it cannot ensure visible
      }
      
      await tester.tap(finder, warnIfMissed: false);
      await settleResilient(tester, frames: 10);
    }

    Future<void> safeEnterText(WidgetTester tester, Finder finder, String text) async {
       await waitFor(tester, finder, message: "Field ${finder.description}");
       await tester.ensureVisible(finder);
       await tester.enterText(finder, text);
       if (isIntegrated) {
         await Future.delayed(const Duration(milliseconds: 250));
       }
       await settleResilient(tester, frames: 5);
    }
    
    Future<void> performLogin(WidgetTester tester) async {
      await tester.pumpWidget(app.HRMSApp(
        theme: ThemeData.dark().copyWith(textTheme: testTextTheme),
        locale: const Locale('en'),
      ));
      await settleResilient(tester);

      if (find.textContaining('Welcome').evaluate().isEmpty) {
        await safeEnterText(tester, find.widgetWithText(TextField, 'e.g. company1'), 'company1');
        await safeEnterText(tester, find.widgetWithText(TextField, 'name@company.com'), 'admin@company1.com');
        await safeEnterText(tester, find.widgetWithText(TextField, '••••••••'), 'password123');
        await safeTap(tester, find.text('Sign In'));
        await waitFor(tester, find.textContaining('Welcome'), message: 'Dashboard');
        await settleResilient(tester);
      }
    }

    testWidgets('Full Workflow: Login -> Profile -> Attendance -> Logout', (tester) async {
      await tester.runAsync(() async {
        print('TEST: performLogin started');
        await performLogin(tester);
        print('TEST: performLogin finished');
        await waitFor(tester, find.textContaining('Admin One'), message: 'Home Screen loaded');
        print('TEST: Home Screen loaded');

        // Navigate to Profile
        final profileBtn = find.byKey(const Key('qa_profile'));
        await scrollTo(tester, profileBtn, scrollable: find.byType(Scrollable).first);
        await safeTap(tester, profileBtn);
        await waitFor(tester, find.text('Edit Profile'), message: "Profile Screen");
        
        // Go back
        await safeTap(tester, find.byType(BackButton).first);
        await waitFor(tester, find.textContaining('Welcome'), message: 'Back to Home');
        
        // Face Verification Clock In
        await safeTap(tester, find.byKey(const Key('qa_clock_in')));
        await waitFor(tester, find.byType(FaceVerificationScreen), message: 'Face Verification');
        await safeTap(tester, find.byKey(const Key('simulate_face_success')));
        await waitFor(tester, find.text('Clock Out'), message: 'Clock state changed');

        // Logout via Settings
        final settingsBtn = find.byKey(const Key('nav_settings'));
        await safeTap(tester, settingsBtn);
        await waitFor(tester, find.text('Settings'), message: 'Settings Screen');
        
        final logoutBtn = find.byKey(const Key('qa_logout_btn'));
        await scrollTo(tester, logoutBtn, scrollable: find.byType(Scrollable).first);
        await safeTap(tester, logoutBtn);
        await safeTap(tester, find.byKey(const Key('qa_logout_confirm')));
        await waitFor(tester, find.text('HRMS Mobile'), message: "Back to Login Screen");
      });
    });

    testWidgets('Leaves Flow: view and apply', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        await safeTap(tester, find.byKey(const Key('qa_leaves')));
        await waitFor(tester, find.text('My Leaves'), message: 'My Leaves Screen');

        // Open Leave Request Form
        await safeTap(tester, find.byType(FloatingActionButton));
        await waitFor(tester, find.text('New Leave Request'), message: 'New Leave Request Screen');
 
        print('TEST: Submitting leave request');
        await safeEnterText(tester, find.byKey(const Key('qa_leave_reason')), 'Integrated test leave');
        print('TEST: Form filled, settling before submit');
        await settleResilient(tester);
        
        await safeTap(tester, find.text('Apply Leave'));
        print('TEST: Leave submitted, waiting for Dashboard list');
        await waitFor(tester, find.text('My Leaves'), message: 'Back to My Leaves');
        print('TEST: Back to My Leaves confirmed');
      });
    });
    
    testWidgets('Payslip: view details', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        await safeTap(tester, find.byKey(const Key('qa_payslip')));
        
        print('TEST: Waiting for Payslip details (Real backend delay...)');
        await settleResilient(tester, frames: 10);
        await waitFor(tester, find.text('NET SALARY'), message: 'Payslip details');
        print('TEST: Payslip details validated');
      });
    });

    testWidgets('Reimbursement: apply flow', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        
        final reimbBtn = find.byKey(const Key('qa_reimbursement'));
        await scrollTo(tester, reimbBtn, scrollable: find.byType(Scrollable).first);
        await safeTap(tester, reimbBtn);
        await waitFor(tester, find.text('My Reimbursements'), message: 'Reimbursement list');
        
        // Open form
        await safeTap(tester, find.byType(FloatingActionButton));
        await waitFor(tester, find.text('New Reimbursement Claim'), message: 'Apply screen');
        
        // Submit Reimbursement
        print('TEST: Submitting reimbursement claim');
        await safeEnterText(tester, find.byKey(const Key('reimb_amount')), '150000');
        await safeEnterText(tester, find.byKey(const Key('reimb_description')), 'Integrated testing transport');
        
        print('TEST: Form filled, settling before submit');
        await settleResilient(tester);
        
        await safeTap(tester, find.text('Submit Claim'));
        print('TEST: Reimbursement submitted, waiting for list');
        await waitFor(tester, find.text('My Reimbursements'), message: 'Back to reimbursement list');
        print('TEST: Back to My Reimbursements confirmed');
      });
    });
    
    testWidgets('Correction Flow', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        
        final correctionBtn = find.byKey(const Key('qa_correction'));
        await scrollTo(tester, correctionBtn, scrollable: find.byType(Scrollable).first);
        await safeTap(tester, correctionBtn);
        await waitFor(tester, find.text('Attendance Correction'), message: 'Correction Screen');
        
        await safeTap(tester, find.text('History'));
        print('TEST: Switched to History tab, waiting for content');
        await waitFor(tester, find.byIcon(Icons.edit_calendar), message: 'History entries');
        
        // Settle a bit more to ensure list is stable
        await settleResilient(tester, frames: 10);
        
        final editBtn = find.byIcon(Icons.edit_calendar).first;
        if (editBtn.evaluate().isNotEmpty) {
           print('TEST: Clicking edit calendar');
           await safeTap(tester, editBtn);
           await waitFor(tester, find.byKey(const Key('correction_reason')), message: 'Correction request modal');
           await safeEnterText(tester, find.byKey(const Key('correction_reason')), 'Test forgot to clock out');
           await safeTap(tester, find.text('Submit Request'));
           print('TEST: Waiting for transition back to Correction screen');
           await waitFor(tester, find.text('Attendance Correction'), message: 'Back to correction screen');
           print('TEST: Correction Flow successful');
        } else {
           throw Exception('Correction Flow failed: Edit icon not found even after wait');
        }
      });
    });

    testWidgets('Performance Flow', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        
        final perfBtn = find.byKey(const Key('qa_performance'));
        await scrollTo(tester, perfBtn, scrollable: find.byType(Scrollable).first);
        await safeTap(tester, perfBtn);
        await waitFor(tester, find.text('Current KPIs'), message: 'Performance Screen');
        
        if (find.text('Review').evaluate().isNotEmpty) {
          await safeTap(tester, find.text('Review').first);
          await waitFor(tester, find.text('Self Appraisal'), message: 'Appraisal Screen');
          await tester.enterText(find.byType(TextField).first, 'Good progress');
          await safeTap(tester, find.text('Submit Self Review'));
          await waitFor(tester, find.text('Performance'), message: 'Back to Performance');
        }
      });
    });

    testWidgets('Profile Update Resilience', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        
        final profileBtn = find.byKey(const Key('qa_profile'));
        await scrollTo(tester, profileBtn, scrollable: find.byType(Scrollable).first);
        await safeTap(tester, profileBtn);
        await waitFor(tester, find.text('Edit Profile'), message: 'Profile screen');
        
        // Use QA keys
        await safeEnterText(tester, find.byKey(const Key('profile_phone')), '081299998888');
        await safeEnterText(tester, find.byKey(const Key('profile_address')), 'Jl. QA Test Complete No. 123');
        await safeEnterText(tester, find.byKey(const Key('profile_ktp')), '3171010101010001'); // Original Seed
        await safeEnterText(tester, find.byKey(const Key('profile_npwp')), '012345678901234'); // Original Seed
        
        // Select PTKP Status (Mandatory for validation)
        await safeTap(tester, find.text('PTKP Status'));
        await settleResilient(tester);
        await safeTap(tester, find.text('TK/0').last);
        await settleResilient(tester);
        
        print('TEST: Saving profile updates');
        await safeTap(tester, find.byKey(const Key('profile_save_btn')));
        print('TEST: Waiting for success notification');
        await waitFor(tester, find.textContaining('successfully'), message: 'Success snackbar');
        
        print('TEST: Profile update successful, waiting for Dashboard redirect');
        // Goes back to Dashboard
        await waitFor(tester, find.textContaining('Welcome'), message: 'Dashboard');
      });
    });
  });
}
