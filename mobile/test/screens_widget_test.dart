import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/screens/correction_request_screen.dart';
import 'package:mobile/screens/performance_dashboard_screen.dart';
import 'package:mobile/screens/self_appraisal_screen.dart';
import 'package:mobile/screens/login_screen.dart';
import 'package:mobile/screens/home_screen.dart';
import 'test_helper.dart';

Widget createWidgetUnderTest(Widget home) {
  return MaterialApp(
    localizationsDelegates: const [
      AppLocalizations.delegate,
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    supportedLocales: const [
      Locale('en'),
      Locale('id'),
    ],
    home: home,
  );
}

void main() {
  setUp(() async {
    await setupMockApiService();
  });

  testWidgets('CorrectionRequestScreen renders correctly with default empty data', (tester) async {
    await tester.pumpWidget(
      createWidgetUnderTest(CorrectionRequestScreen(userData: {'fullname': 'Tester'})),
    );

    await tester.pumpAndSettle();

    expect(find.text('Attendance Correction'), findsOneWidget);
    expect(find.text('History'), findsOneWidget);
    expect(find.text('Requests'), findsOneWidget);
    // Data list is empty by default in the mock client created by setupMockApiService
    expect(find.byType(ListView), findsOneWidget);
  });

  testWidgets('PerformanceDashboardScreen shows empty states for no KPI and appraisal', (tester) async {
    await tester.pumpWidget(
      createWidgetUnderTest(PerformanceDashboardScreen(userData: {'fullname': 'Tester'})),
    );

    await tester.pumpAndSettle();

    expect(find.text('Performance'), findsOneWidget);
    expect(find.text('No active KPI targets assigned.'), findsOneWidget);
    expect(find.text('No appraisals records found.'), findsOneWidget);
  });

  testWidgets('SelfAppraisalScreen displays form fields and review content', (tester) async {
    await tester.pumpWidget(
      createWidgetUnderTest(SelfAppraisalScreen(appraisal: {'id': 1, 'period_name': 'Q1'}, userData: {'employee_id': 101})),
    );

    await tester.pumpAndSettle();

    expect(find.text('Self Appraisal'), findsOneWidget);
    expect(find.text('Review for Q1'), findsOneWidget);
    expect(find.text('Submit Self Review'), findsOneWidget);

    // Do not tap submit to avoid platform-dependent snackbar behavior in this test.
  });

  testWidgets('LoginScreen displays all input fields and sign in button', (tester) async {
    await tester.pumpWidget(
      createWidgetUnderTest(const LoginScreen()),
    );

    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('HRMS Mobile'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'e.g. company1'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'name@company.com'), findsOneWidget);
    expect(find.widgetWithText(TextField, '••••••••'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });

  testWidgets('HomeScreen renders with welcome message and quick access buttons', (tester) async {
    final userData = {
      'fullname': 'John Doe',
      'role_name': 'Employee',
      'employee_id': 101,
    };

    await tester.pumpWidget(
      createWidgetUnderTest(const HomeScreen()),
    );

    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Welcome back,'), findsOneWidget);
    expect(find.text('Admin One'), findsOneWidget);
    
    // Quick access buttons check
    expect(find.text('Clock In'), findsOneWidget);
    expect(find.text('Leaves'), findsOneWidget);
    expect(find.text('Reimbursement'), findsOneWidget);
    expect(find.text('Performance'), findsOneWidget);
    expect(find.text('My Profile'), findsOneWidget);
  });
}
