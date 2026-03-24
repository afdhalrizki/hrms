import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/services.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const MethodChannel channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  final Map<String, String> mockSecureStorage = {};

  setUpAll(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      channel,
      (MethodCall methodCall) async {
        if (methodCall.method == 'read') return mockSecureStorage[methodCall.arguments['key']];
        return null;
      },
    );
  });

  group('Phase M3: Attendance Correction Tests', () {
    late ApiService apiService;

    setUp(() {
      ApiService.reset();
      SharedPreferences.setMockInitialValues({});
    });

    test('getAttendanceRecords returns list on success', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode([{'id': 1, 'date': '2026-03-24'}]), 200);
      });
      apiService = ApiService(client: mockClient);
      await apiService.setTenant('company1');
      final list = await apiService.getAttendanceRecords();
      expect(list.length, 1);
      expect(list[0]['id'], 1);
    });

    test('submitCorrectionRequest sends POST with correct payload', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/api/attendance-correction-requests/');
        final body = jsonDecode(request.body);
        expect(body['attendance'], 123);
        expect(body['reason'], 'Oops');
        return http.Response(jsonEncode({'id': 1}), 201);
      });
      apiService = ApiService(client: mockClient);
      await apiService.setTenant('company1');
      await apiService.submitCorrectionRequest({
        'attendance': 123,
        'requested_check_in': '08:00:00',
        'requested_check_out': '17:00:00',
        'reason': 'Oops',
      });
    });
  });
}
