import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';
import 'package:mobile/screens/login_screen.dart';

void main() {
  testWidgets('App smoke test - renders Login screen', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const HRMSApp());

    // Verify that the login screen title exists.
    expect(find.text('HRMS Mobile'), findsOneWidget);
    expect(find.text('Secure Employee Portal'), findsOneWidget);
    
    // Verify that we have input fields
    expect(find.text('COMPANY SUBDOMAIN'), findsOneWidget);
    expect(find.text('EMAIL ADDRESS'), findsOneWidget);
    expect(find.text('PASSWORD'), findsOneWidget);
  });
}
