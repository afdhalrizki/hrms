import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  final apiService = ApiService();

  group('Phase M2: Profile & Documents Tests (Integrated)', () {
    setUp(() async {
      await setupIntegratedTest();
    });

    test('getEmployeeProfile returns current user data', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      expect(profile['email'], isNotNull);
    });

    test('updateProfile allows updating own data', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      final id = profile['employee_id'];
      await apiService.updateProfile(id, {'phone': '081299998888'});
    });

    test('updateProfile fails with invalid data type (nik as object)', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      expect(
        () => apiService.updateProfile(profile['employee_id'], {'nik': {'invalid': 1}}),
        throwsException,
      );
    });

    test('uploadDocument fails with invalid image data', () async {
      await loginForTest();
      final profile = await apiService.getEmployeeProfile();
      final id = profile['employee_id'];
      expect(
        () => apiService.uploadDocument(id, 'ktp_image', [1, 2, 3, 4], 'test.png'),
        throwsException,
      );
    });
  });
}
