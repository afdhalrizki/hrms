import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/screens/correction_request_screen.dart';
import 'package:mobile/screens/performance_dashboard_screen.dart';
import 'package:mobile/screens/self_appraisal_screen.dart';
import 'test_helper.dart';

void main() {
  setUp(() async {
    await setupMockApiService();
  });

  testWidgets('CorrectionRequestScreen renders correctly with default empty data', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CorrectionRequestScreen(userData: {'fullname': 'Tester'}),
      ),
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
      MaterialApp(
        home: PerformanceDashboardScreen(userData: {'fullname': 'Tester'}),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Performance'), findsOneWidget);
    expect(find.text('No active KPI targets assigned.'), findsOneWidget);
    expect(find.text('No appraisals records found.'), findsOneWidget);
  });

  testWidgets('SelfAppraisalScreen displays form fields and review content', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: SelfAppraisalScreen(appraisal: {'id': 1, 'period_name': 'Q1'}, userData: {'employee_id': 101}),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Self Appraisal'), findsOneWidget);
    expect(find.text('Review for Q1'), findsOneWidget);
    expect(find.text('Submit Self Review'), findsOneWidget);

    // Do not tap submit to avoid platform-dependent snackbar behavior in this test.
  });
}
