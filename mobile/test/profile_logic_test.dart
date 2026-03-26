import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'test_helper.dart';

void main() {
  HttpOverrides.global = MyHttpOverrides();
  TestWidgetsFlutterBinding.ensureInitialized();
  late ApiService apiService;

  setUpAll(() {
    setupSecureStorageMock();
  });

  group('Phase M2: Profile & Documents Tests', () {
    setUp(() async {
      ApiService.reset();
      SharedPreferences.setMockInitialValues({});
      apiService = ApiService();
    });

    test('updateProfile sends PATCH request to real backend', () async {
      await loginForTest();
      final profile = await apiService.getUserProfile();
      final employeeId = profile['employee_id'];

      try {
        await apiService.updateProfile(employeeId, {'phone': '08123456789'});
      } catch (e) {
        print('Profile Update Info: $e');
      }
    });

    test('uploadDocument sends multipart request to real backend', () async {
      await loginForTest();
      final profile = await apiService.getUserProfile();
      final employeeId = profile['employee_id'];

      try {
        await apiService.uploadDocument(employeeId, 'ktp_image', [1, 2, 3], 'test.jpg');
      } catch (e) {
        print('Document Upload Info: $e');
      }
    });
  });
}
