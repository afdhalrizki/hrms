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
      ApiService.reset(); // Absolute static isolation
      await setupTestEnvironment();
      
      // Strict reset for all environmental flags
      mockErrorStatus = false;
      mockEmptyResponse = false;
      mockTokenExpired = false;
      mockErrorMessage = 'Error';
      
      final binding = TestWidgetsFlutterBinding.ensureInitialized();
      binding.platformDispatcher.implicitView!.physicalSize = const Size(1080, 1920);
      binding.platformDispatcher.implicitView!.devicePixelRatio = 1.0;
    });

    tearDown(() {
      // Explicit reset to prevent leakage
      mockErrorStatus = false;
      mockEmptyResponse = false;
      mockTokenExpired = false;
      mockErrorMessage = 'Error';
      ApiService.reset();
      final binding = TestWidgetsFlutterBinding.ensureInitialized();
      binding.platformDispatcher.implicitView!.resetPhysicalSize();
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
       if (isIntegrated) {
         await Future.delayed(const Duration(milliseconds: 250));
       }
       await tester.pumpAndSettle();
    }
    
    Future<void> performLogin(WidgetTester tester) async {
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

    // PRIORITIESED LOGIC SCENARIOS (LOGIC-FIRST)
    group('E2E Logic Scenarios', () {
      testWidgets('Empty States Flow', (tester) async {
        await tester.runAsync(() async {
          mockEmptyResponse = true;
          await performLogin(tester);
          await safeTap(tester, find.byKey(const Key('qa_leaves'), skipOffstage: false));
          await tester.pumpAndSettle();
          await waitFor(tester, find.textContaining('No leave requests found', skipOffstage: false), message: 'Leave empty state');
          await safeTap(tester, find.byType(BackButton, skipOffstage: false).last);

          await safeTap(tester, find.byKey(const Key('qa_reimbursement'), skipOffstage: false));
          await tester.pumpAndSettle();
          await waitFor(tester, find.textContaining('No claims found', skipOffstage: false), message: 'Reimbursement empty state');
        });
      });

      testWidgets('Global Error Handling', (tester) async {
        await tester.runAsync(() async {
          await performLogin(tester);
          mockErrorStatus = true;
          mockErrorMessage = "Server Down";
          
          final navFinder = find.byKey(const Key('nav_schedule'), skipOffstage: false);
          await tester.tap(navFinder, warnIfMissed: false);
          
          await tester.pump();
          tester.takeException(); 
 
          await waitFor(tester, find.textContaining('fetch schedules', skipOffstage: false), message: 'Error in body');
        });
      });

      testWidgets('Face Verification Failure', (tester) async {
        await tester.runAsync(() async {
          await performLogin(tester);
          await safeTap(tester, find.byKey(const Key('qa_clock_in'), skipOffstage: false));
          await tester.pumpAndSettle();
          
          // Pattern: Animation-Safe pumpAndSettle Alignment
          final failBtn = find.byKey(const Key('simulate_face_failure'), skipOffstage: false);
          await safeTap(tester, failBtn);
          
          await waitFor(tester, find.textContaining('failed', skipOffstage: false), message: 'Verification failed message');
        });
      });

      testWidgets('Correction Flow', (tester) async {
        await tester.runAsync(() async {
          await performLogin(tester);
          final correctionBtn = find.byKey(const Key('qa_correction'), skipOffstage: false);
          await scrollTo(tester, correctionBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
          await safeTap(tester, correctionBtn);
          await tester.pumpAndSettle();
          
          await safeTap(tester, find.text('History', skipOffstage: false));
          await tester.pumpAndSettle();
          
          // Animation-Safe pumpAndSettle Interaction with modal delay
          final editBtn = find.byKey(const Key('qa_edit_record_0'), skipOffstage: false);
          await waitFor(tester, editBtn, message: 'Edit Icon for first record');
          await safeTap(tester, editBtn);
          
          await tester.pump(const Duration(seconds: 1)); // Wait for Modal Animation
          await tester.pumpAndSettle(const Duration(milliseconds: 100), EnginePhase.sendSemanticsUpdate, const Duration(seconds: 30)); 
             
          await safeEnterText(tester, find.byKey(const Key('correction_reason'), skipOffstage: false), 'Testing correction');
             
          final submitBtn = find.text('Submit Request', skipOffstage: false);
          await safeTap(tester, submitBtn);
             
          await waitFor(tester, find.text('Attendance Correction', skipOffstage: false), message: 'Back to correction screen');
        });
      });

      testWidgets('Token Auto-Refresh Resilience', (tester) async {
        await tester.runAsync(() async {
          await performLogin(tester);
          mockTokenExpired = true;
          await safeTap(tester, find.byKey(const Key('nav_schedule'), skipOffstage: false), settleBefore: false);
          await tester.pumpAndSettle();
          await waitFor(tester, find.text('My Schedule', skipOffstage: false), message: 'Schedule screen after refresh');
        });
      });
    });

    // MAIN APPLICATION FLOWS
    testWidgets('Full Workflow: Login -> Profile -> Attendance -> Logout', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        await waitFor(tester, find.textContaining('Admin One', skipOffstage: false), message: 'Home Screen loaded');

        final profileBtn = find.byKey(const Key('qa_profile'), skipOffstage: false);
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

    testWidgets('Leaves Flow: view and apply', (tester) async {
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
    
    testWidgets('Payslip: view details', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        await safeTap(tester, find.byKey(const Key('qa_payslip'), skipOffstage: false));
        await tester.pumpAndSettle();
        await waitFor(tester, find.text('NET SALARY', skipOffstage: false), message: 'Payslip details');
      });
    });

    testWidgets('Reimbursement: apply flow', (tester) async {
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

    testWidgets('Performance Flow', (tester) async {
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

    testWidgets('Profile Update Resilience', (tester) async {
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
        
        await safeTap(tester, find.byKey(const Key('profile_save_btn'), skipOffstage: false));
        await waitForSnackBar(tester, 'successfully');
        await waitFor(tester, find.textContaining('Welcome', skipOffstage: false), message: 'Dashboard');
      });
    });

    testWidgets('Invalid Login Case', (tester) async {
      await tester.runAsync(() async {
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

    testWidgets('Documents Flow: upload and verify', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final docsBtn = find.byKey(const Key('qa_documents'), skipOffstage: false);
        await scrollTo(tester, docsBtn, scrollable: find.byType(Scrollable, skipOffstage: false).first);
        await safeTap(tester, docsBtn);
        await waitFor(tester, find.text('Documents', skipOffstage: false), message: 'Documents Screen');
        await safeTap(tester, find.byKey(const Key('simulate_doc_capture'), skipOffstage: false));
        await waitForSnackBar(tester, 'uploaded successfully');
      });
    });

    testWidgets('Schedule Flow: view list', (tester) async {
      await tester.runAsync(() async {
        await performLogin(tester);
        final scheduleBtn = find.byKey(const Key('nav_schedule'), skipOffstage: false);
        await safeTap(tester, scheduleBtn);
        await waitFor(tester, find.text('My Schedule', skipOffstage: false), message: 'Schedule Screen');
        expect(find.byIcon(Icons.access_time_filled, skipOffstage: false), findsAtLeast(1));
      });
    });
  });
}
