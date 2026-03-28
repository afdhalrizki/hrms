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

  // Mock FlutterSecureStorage Platform Channel (plugins.it_nomads.com for newest version)
  const MethodChannel('plugins.it_nomads.com/flutter_secure_storage')
      .setMockMethodCallHandler((MethodCall methodCall) async {
    return null; // All operations succeed and return null/empty
  });

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

      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();

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
  });
}
