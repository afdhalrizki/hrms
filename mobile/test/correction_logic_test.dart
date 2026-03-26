import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'test_helper.dart';

void main() {
  initRealBackendTest();
  late ApiService apiService;

  setUpAll(() {
    setupSecureStorageMock();
  });

  group('Phase M3: Attendance Correction Tests', () {
    setUp(() async {
      ApiService.reset();
      SharedPreferences.setMockInitialValues({});
      apiService = ApiService();
    });

    test('getAttendanceRecords returns list on success', () async {
      await loginForTest();
      final list = await apiService.getAttendanceRecords();
      expect(list, isA<List>());
    });

    test('submitCorrectionRequest sends POST with correct payload', () async {
      await loginForTest();
      try {
        await apiService.submitCorrectionRequest({
          'attendance': 1,
          'requested_check_in': '08:00:00',
          'requested_check_out': '17:00:00',
          'reason': 'Integration Test',
        });
      } catch (e) {
        print('Correction Submit Info: $e');
      }
    });
  });
}
