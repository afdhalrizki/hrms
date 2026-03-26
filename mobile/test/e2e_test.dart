import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/main.dart' as app;
import 'package:mobile/screens/face_verification_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() {
  HttpOverrides.global = MyHttpOverrides();
  TestWidgetsFlutterBinding.ensureInitialized();


  group('End-to-End App Flow Test', () {
    testWidgets('Login -> Profile -> Attendance -> Logout Flow',
        (tester) async {
      
      // Clear persistent storage before E2E start
      ApiService.reset();
      // Ensure we use a clean SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();


      // Start the app
      app.main();
      await tester.pumpAndSettle();

      // 1. Authentication (Login)
      expect(find.text('HRMS Mobile'), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextField, 'e.g. company1'), 'company1');
      await tester.enterText(find.widgetWithText(TextField, 'name@company.com'), 'admin@company1.com');
      await tester.enterText(find.widgetWithText(TextField, '••••••••'), 'password123');
      
      // Tap the Sign In button
      final signInBtn = find.text('Sign In');
      await tester.ensureVisible(signInBtn);
      await tester.pumpAndSettle();
      await tester.tap(signInBtn);
      await tester.pumpAndSettle();

      // Check if we arrived at the Dashboard
      expect(find.text('Welcome back,'), findsWidgets);
      expect(find.text('Admin One'), findsWidgets);

      // 2. Navigate to Profile
      final profileBtn = find.text('My Profile');
      await tester.ensureVisible(profileBtn);
      await tester.pumpAndSettle();
      await tester.tap(profileBtn);
      await tester.pumpAndSettle();
      
      final profileFinder = find.text('Edit Profile');
      if (profileFinder.evaluate().isEmpty) {
        final allTexts = find.byType(Text).evaluate().toList();
        for (var t in allTexts) {
          final textWidget = t.widget as Text;
          print('Screen Text: ${textWidget.data}');
        }
      }
      expect(profileFinder, findsWidgets);
      
      // Navigate back to Home
      final BackButtonFinder = find.byType(BackButton);
      if (BackButtonFinder.evaluate().isNotEmpty) {
        await tester.tap(BackButtonFinder.first);
        await tester.pumpAndSettle();
      }
      
      // Find Clock Out button by scrolling up the CustomScrollView until it appears
      final clockOutBtn = find.text('Clock Out');
      await tester.scrollUntilVisible(
        clockOutBtn,
        -100.0, // Scroll up (negative delta) 
        scrollable: find.byType(Scrollable).first,
        maxScrolls: 50,
      );
      await tester.pumpAndSettle();
      
      await tester.tap(clockOutBtn);
      
      // Wait for the navigation transition, but don't settle because FaceVerificationScreen has an infinite animation
      for (int i = 0; i < 10; i++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      
      // Ensure face verification screen shows up
      expect(find.byType(FaceVerificationScreen), findsWidgets);
      
      // Navigate back to Home from verification
      final BackButtonVerification = find.byType(BackButton);
      if (BackButtonVerification.evaluate().isNotEmpty) {
        await tester.tap(BackButtonVerification.first);
        await tester.pumpAndSettle();
      }

      // 3. Navigate to Settings and Logout
      final settingsBtn = find.byIcon(Icons.settings);
      await tester.tap(settingsBtn);
      await tester.pumpAndSettle();

      expect(find.text('Settings'), findsWidgets);
      expect(find.text('Admin One'), findsWidgets);

      final logoutBtn = find.text('Logout');
      await tester.scrollUntilVisible(
        logoutBtn,
        50.0,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(logoutBtn);
      await tester.pumpAndSettle();

      // Confirm Logout Dialog
      final confirmLogout = find.text('Logout').last; 
      await tester.tap(confirmLogout);
      await tester.pumpAndSettle();

      // Ensure we are back at Login
      expect(find.text('HRMS Mobile'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
    });
  });
}
