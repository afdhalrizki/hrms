import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/models/user_model.dart';
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
        if (methodCall.method == 'write') {
          mockSecureStorage[methodCall.arguments['key']] = methodCall.arguments['value'];
          return null;
        } else if (methodCall.method == 'read') {
          return mockSecureStorage[methodCall.arguments['key']];
        } else if (methodCall.method == 'delete') {
          mockSecureStorage.remove(methodCall.arguments['key']);
          return null;
        }
        return null;
      },
    );
  });

  group('Infrastructure Alignment Tests', () {
    late ApiService apiService;

    setUp(() {
      ApiService.reset();
      SharedPreferences.setMockInitialValues({});
    });

    test('ApiService injects X-Tenant-Domain and Host headers', () async {
      final mockClient = MockClient((request) async {
        // Verify Headers
        expect(request.headers['X-Tenant-Domain'], 'company1.localhost');
        expect(request.headers['Host'], 'company1.localhost:8000');
        expect(request.headers['Content-Type'], 'application/json');
        
        return http.Response(jsonEncode({'id': 1}), 200);
      });

      apiService = ApiService(client: mockClient);
      await apiService.setTenant('company1');
      await apiService.getUserProfile();
    });

    test('ApiService.login uses /api/auth/login/ endpoint', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path == '/api/auth/login/') {
          return http.Response(jsonEncode({'token': 'abc'}), 200);
        }
        return http.Response('Wrong Endpoint', 404);
      });

      apiService = ApiService(client: mockClient);
      final result = await apiService.login('test@test.com', 'password', 'company1');
      expect(result['token'], 'abc');
    });

    test('User model handles all backend fields', () {
      final data = {
        'id': 1,
        'email': 'user@test.com',
        'is_staff': true,
        'employee_id': 10,
        'employee_nik': 'NIK-123',
        'fullname': 'Test User',
        'role_name': 'Developer',
        'department_name': 'IT'
      };
      
      final user = User.fromJson(data);
      expect(user.isStaff, true);
      expect(user.roleName, 'Developer');
      expect(user.employeeNik, 'NIK-123');
    });
  });
}
