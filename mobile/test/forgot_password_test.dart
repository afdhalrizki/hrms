import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/screens/login_screen.dart';
import 'package:mobile/screens/forgot_password_screen.dart';
import 'package:mobile/l10n/app_localizations.dart';
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
    await setupIntegratedTest(isWidgetTest: true);
  });

  tearDown(() {
    mockSecureStorage.clear();
  });

  Future<void> patientTeardown(WidgetTester tester) async {
    await tester.idle();
    await tester.pumpWidget(Container());
    await tester.pumpAndSettle();
  }

  group('ForgotPassword Mobile Tests', () {
    test('ApiService: forgotPassword succeeds with valid email/tenant', () async {
      final api = ApiService();
      // Test forgot password against real backend (with auth_test@test.com created by backend setup)
      final result = await api.forgotPassword('auth_test@test.com', 'company1');
      expect(result, isNotNull);
      expect(result['detail'], isNotNull);
    });

    testWidgets('LoginScreen displays Lupa Kata Sandi link', (tester) async {
      await tester.runAsync(() async {
        mockSecureStorage.clear();
        await tester.pumpWidget(createWidgetUnderTest(const LoginScreen()));
        await tester.pumpAndSettle();

        // The button has key Key('forgot_password_btn')
        final forgotBtnFinder = find.byKey(const Key('forgot_password_btn'));
        expect(forgotBtnFinder, findsOneWidget);
        await patientTeardown(tester);
      });
    });

    testWidgets('ForgotPasswordScreen renders correctly and shows elements', (tester) async {
      await tester.runAsync(() async {
        await tester.pumpWidget(createWidgetUnderTest(const ForgotPasswordScreen()));
        await tester.pumpAndSettle();

        expect(find.byType(Form), findsOneWidget);
        expect(find.byKey(const Key('forgot_subdomain_input')), findsOneWidget);
        expect(find.byKey(const Key('forgot_email_input')), findsOneWidget);
        expect(find.byKey(const Key('forgot_submit_btn')), findsOneWidget);

        await patientTeardown(tester);
      });
    });

    testWidgets('ForgotPasswordScreen validates empty fields', (tester) async {
      await tester.runAsync(() async {
        await tester.pumpWidget(createWidgetUnderTest(const ForgotPasswordScreen()));
        await tester.pumpAndSettle();

        // Click submit without entering anything
        await tester.tap(find.byKey(const Key('forgot_submit_btn')));
        await tester.pumpAndSettle();

        // Should show validation errors
        expect(
          find.text('Subdomain is required').evaluate().isNotEmpty || 
          find.text('Subdomain wajib diisi').evaluate().isNotEmpty,
          true
        );

        await patientTeardown(tester);
      });
    });
  });
}
