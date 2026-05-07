import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/screens/login_screen.dart';
import 'package:mobile/screens/home_screen.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/widgets/loading_indicator.dart';
import 'test_helper.dart';

Widget createWidgetUnderTest(Widget home) {
  return MaterialApp(
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: const [Locale('en'), Locale('id')],
    locale: const Locale('en'),
    home: home,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    await setupIntegratedTest(isWidgetTest: true);
  });

  tearDown(() {
    mockSecureStorage.clear();
    ApiService.reset();
  });

  Future<void> patientTeardown(WidgetTester tester) async {
    await tester.idle();
    await tester.pumpWidget(Container());
    await tester.pumpAndSettle();
  }

  group('Mobile Authentication Redirection Tests', () {
    testWidgets('Unauthenticated: App starts and remains on LoginScreen', (tester) async {
      await tester.runAsync(() async {
        mockSecureStorage.clear();
        await tester.pumpWidget(createWidgetUnderTest(const LoginScreen()));
        
        // Wait for token check
        for (int i = 0; i < 10; i++) {
          await tester.pump(const Duration(milliseconds: 100));
          await Future.delayed(const Duration(milliseconds: 50));
        }
        await tester.pumpAndSettle();
        
        expect(find.byType(LoginScreen), findsOneWidget);
        expect(find.text('Sign In'), findsOneWidget);
        
        await patientTeardown(tester);
      });
    });

    testWidgets('Authenticated: App starts and auto-navigates to HomeScreen', (tester) async {
      await tester.runAsync(() async {
        await loginForTest(); 
        await tester.pumpWidget(createWidgetUnderTest(const LoginScreen()));
        
        // 1. Wait for auto-navigation to HomeScreen
        bool reachedHome = false;
        for (int i = 0; i < 30; i++) {
          await tester.pump(const Duration(milliseconds: 200));
          await Future.delayed(const Duration(milliseconds: 50));
          if (find.byType(HomeScreen).evaluate().isNotEmpty) {
            reachedHome = true;
            break;
          }
        }
        expect(reachedHome, isTrue, reason: 'Should have navigated to HomeScreen');
        
        // 2. Wait for HomeScreen to finish loading (AppLoadingIndicator should be gone)
        bool loaded = false;
        for (int i = 0; i < 40; i++) {
          await tester.pump(const Duration(milliseconds: 200));
          await Future.delayed(const Duration(milliseconds: 50));
          if (find.byType(AppLoadingIndicator).evaluate().isEmpty) {
            loaded = true;
            break;
          }
        }
        expect(loaded, isTrue, reason: 'Loading indicator should disappear');
        
        expect(find.byType(HomeScreen), findsOneWidget);
        expect(find.byType(LoginScreen), findsNothing);
        
        await patientTeardown(tester);
      });
    });

    testWidgets('Logout: User is redirected back to LoginScreen', (tester) async {
      await tester.runAsync(() async {
        await loginForTest();
        await tester.pumpWidget(createWidgetUnderTest(const LoginScreen()));
        
        // 1. Wait for HomeScreen
        bool reachedHome = false;
        for (int i = 0; i < 30; i++) {
          await tester.pump(const Duration(milliseconds: 200));
          await Future.delayed(const Duration(milliseconds: 50));
          if (find.byType(HomeScreen).evaluate().isNotEmpty) {
            reachedHome = true;
            break;
          }
        }
        expect(reachedHome, isTrue);

        // 2. Wait for Home Screen data to load
        bool loaded = false;
        for (int i = 0; i < 40; i++) {
          await tester.pump(const Duration(milliseconds: 200));
          await Future.delayed(const Duration(milliseconds: 50));
          if (find.byType(AppLoadingIndicator).evaluate().isEmpty) {
            loaded = true;
            break;
          }
        }
        expect(loaded, isTrue);

        // 3. Navigate to Settings
        final settingsBtn = find.byKey(const Key('nav_settings'));
        expect(settingsBtn, findsOneWidget);
        await tester.tap(settingsBtn);
        
        // SettingsScreen loading
        for (int i = 0; i < 20; i++) {
          await tester.pump(const Duration(milliseconds: 100));
          await Future.delayed(const Duration(milliseconds: 50));
        }
        await tester.pumpAndSettle();
        
        // 4. Perform Logout
        final logoutBtn = find.byKey(const Key('qa_logout_btn'));
        await tester.ensureVisible(logoutBtn);
        await tester.tap(logoutBtn);
        await tester.pumpAndSettle();
        
        final confirmBtn = find.byKey(const Key('qa_logout_confirm'));
        expect(confirmBtn, findsOneWidget);
        await tester.tap(confirmBtn);
        
        // Wait for navigation back to Login
        for (int i = 0; i < 30; i++) {
          await tester.pump(const Duration(milliseconds: 200));
          await Future.delayed(const Duration(milliseconds: 50));
          if (find.byType(LoginScreen).evaluate().isNotEmpty) break;
        }
        await tester.pumpAndSettle();
        
        expect(find.byType(LoginScreen), findsOneWidget, reason: 'Should have returned to LoginScreen');
        
        await patientTeardown(tester);
      });
    });
  });
}
