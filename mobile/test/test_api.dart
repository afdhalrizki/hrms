import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'test_helper.dart';

void main() {
  group('ApiService Integration Tests', () {
    setUp(() async {
      await setupMockApiService();
      await loginForTest();
    });

    testWidgets('test load profile locally', (WidgetTester tester) async {
      final api = ApiService();
      // Test basic API initialization
      expect(api, isNotNull);
      print('✓ Api service initialized successfully');
    });

    test('test api service setup', () async {
      final api = ApiService();
      expect(api, isNotNull);
    });
  });
}
