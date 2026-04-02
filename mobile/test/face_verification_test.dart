import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/screens/face_verification_screen.dart';
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

  testWidgets('FaceVerificationScreen renders correctly and can be skipped in tests', (tester) async {
    bool? verified;
    
    await tester.pumpWidget(
      createWidgetUnderTest(
        Builder(
          builder: (context) => ElevatedButton(
            onPressed: () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const FaceVerificationScreen(isClockIn: true)),
              );
              verified = result?['verified'];
            },
            child: const Text('Go'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Go'));
    // Wait for the build to happen
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text('Face Verification'), findsOneWidget);
    
    // Find our simulate button
    final simulateBtn = find.byKey(const Key('simulate_face_success'));
    expect(simulateBtn, findsOneWidget);

    await tester.tap(simulateBtn);
    await tester.pumpAndSettle();

    // Verification happens after 1 second delay in _completeVerification
    await tester.pump(const Duration(seconds: 2));
    await tester.pumpAndSettle();

    expect(find.byType(FaceVerificationScreen), findsNothing);
    expect(verified, isTrue);
  });
}
