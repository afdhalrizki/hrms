import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/screens/correction_request_screen.dart';
import 'package:mobile/screens/performance_dashboard_screen.dart';
import 'package:mobile/screens/self_appraisal_screen.dart';
import 'package:mobile/screens/login_screen.dart';
import 'package:mobile/screens/home_screen.dart';
import 'package:mobile/screens/settings_screen.dart';
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
    home: home,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    // setupIntegratedTest now handles 1080x2400 surface size for consistent hit-testing
    await setupIntegratedTest(isWidgetTest: true);
    await loginForTest();
  });

  tearDown(() {
    mockSecureStorage.clear();
  });

  // Patient teardown to drain microtasks and settle animations
  Future<void> patientTeardown(WidgetTester tester) async {
    // 1. Drain any pending microtasks (important for ApiService futures)
    await tester.idle();
    // 2. Clear the widget tree
    await tester.pumpWidget(Container());
    // 3. Settle any remaining animations
    await tester.pumpAndSettle();
  }

  testWidgets('CorrectionRequestScreen renders correctly', (tester) async {
    await tester.runAsync(() async {
      await tester.pumpWidget(createWidgetUnderTest(const CorrectionRequestScreen(userData: {'fullname': 'Admin One'})));
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.textContaining('Correction'), findsOneWidget);
      await patientTeardown(tester);
    });
  });

  testWidgets('PerformanceDashboardScreen shows real data', (tester) async {
    await tester.runAsync(() async {
      await tester.pumpWidget(createWidgetUnderTest(const PerformanceDashboardScreen(userData: {'fullname': 'Admin One'})));
      
      // Pump frames and let async API calls complete
      for (int i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 100));
        await Future.delayed(const Duration(milliseconds: 50));
      }
      
      // Expecting real data headers or content
      expect(find.textContaining('KPI'), findsWidgets);
      
      await patientTeardown(tester);
    });
  });

  testWidgets('PerformanceDashboardScreen renders correctly', (tester) async {
    await tester.runAsync(() async {
      await tester.pumpWidget(createWidgetUnderTest(const PerformanceDashboardScreen(userData: {'fullname': 'Admin One'})));
      
      // Pump frames and let async API calls complete
      for (int i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 100));
        await Future.delayed(const Duration(milliseconds: 50));
      }
      
      expect(find.textContaining('Performance'), findsOneWidget);
      await patientTeardown(tester);
    });
  });

  testWidgets('SelfAppraisalScreen renders correctly', (tester) async {
    await tester.runAsync(() async {
      await tester.pumpWidget(createWidgetUnderTest(const SelfAppraisalScreen(appraisal: {'id': 1, 'period_name': 'Q1'}, userData: {'employee_id': 101})));
      await tester.pump(const Duration(milliseconds: 500));
      expect(find.textContaining('Appraisal'), findsOneWidget);
      await patientTeardown(tester);
    });
  });

  testWidgets('LoginScreen renders correctly', (tester) async {
    await tester.runAsync(() async {
      // CLEAR STORAGE to avoid auto-navigation from setup login state
      mockSecureStorage.clear(); 
      await tester.pumpWidget(createWidgetUnderTest(const LoginScreen()));
      await tester.pumpAndSettle(const Duration(milliseconds: 500));
      expect(find.text('Sign In'), findsOneWidget);
      expect(find.textContaining('HRMS'), findsOneWidget);
      await patientTeardown(tester);
    });
  });

  testWidgets('LoginScreen password visibility toggle works', (tester) async {
    await tester.runAsync(() async {
      mockSecureStorage.clear();
      await tester.pumpWidget(createWidgetUnderTest(const LoginScreen()));
      await tester.pumpAndSettle(const Duration(milliseconds: 500));

      final passwordTextFieldFinder = find.byType(TextField).last;
      TextField passwordTextField = tester.widget<TextField>(passwordTextFieldFinder);
      expect(passwordTextField.obscureText, isTrue);

      final toggleBtnFinder = find.byKey(const Key('toggle_password_visibility_btn'));
      expect(toggleBtnFinder, findsOneWidget);
      await tester.tap(toggleBtnFinder);
      await tester.pump();

      passwordTextField = tester.widget<TextField>(passwordTextFieldFinder);
      expect(passwordTextField.obscureText, isFalse);

      await tester.tap(toggleBtnFinder);
      await tester.pump();

      passwordTextField = tester.widget<TextField>(passwordTextFieldFinder);
      expect(passwordTextField.obscureText, isTrue);

      await patientTeardown(tester);
    });
  });

  testWidgets('SettingsScreen renders and displays profile data', (tester) async {
    final userData = {
      'fullname': 'Admin One',
      'email': 'admin@company1.com',
      'employee_nik': '101'
    };
    await tester.pumpWidget(createWidgetUnderTest(SettingsScreen(userData: userData)));
    await tester.pumpAndSettle();

    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Admin One'), findsOneWidget);
    expect(find.text('admin@company1.com'), findsOneWidget);
    expect(find.textContaining('101'), findsOneWidget);
  });

  testWidgets('HomeScreen renders correctly', (tester) async {
    await tester.runAsync(() async {
      await tester.pumpWidget(createWidgetUnderTest(const HomeScreen()));
      
      // Pump frames and let _loadProfile() async calls complete
      // Do NOT use pumpAndSettle — CircularProgressIndicator never settles
      for (int i = 0; i < 30; i++) {
        await tester.pump(const Duration(milliseconds: 100));
        await Future.delayed(const Duration(milliseconds: 100));
      }
      
      expect(find.textContaining('Welcome'), findsAtLeast(1));
      expect(find.textContaining('Admin One'), findsAtLeast(1));
      expect(find.textContaining('Clock'), findsAtLeast(1));
      
      await patientTeardown(tester);
    });
  });
}
