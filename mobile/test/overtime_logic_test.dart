import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  final apiService = ApiService();

  group('Overtime Logic Tests (Integrated)', () {
    setUp(() async {
      await setupTestEnvironment();
    });

    test('getOvertimes returns list successfully', () async {
      await loginForTest();
      final data = await apiService.getOvertimes();
      expect(data, isA<List>());
    });

    test('applyOvertime fails with zero hours', () async {
      await loginForTest();
      expect(
        () => apiService.applyOvertime({"date": "2026-04-22", "hours": 0, "reason": "test"}),
        throwsException,
      );
    });

    test('applyOvertime fails with missing reason', () async {
      await loginForTest();
      expect(
        () => apiService.applyOvertime({"date": "2026-04-22", "hours": 2.0}),
        throwsException,
      );
    });
  });
}
