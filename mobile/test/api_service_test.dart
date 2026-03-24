import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/models/user_model.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Mock for flutter_secure_storage
  // Based on failure logs, the channel name is plugins.it_nomads.com/flutter_secure_storage
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
        } else if (methodCall.method == 'readAll') {
          return mockSecureStorage;
        } else if (methodCall.method == 'deleteAll') {
          mockSecureStorage.clear();
          return null;
        }
        return null;
      },
    );
  });

  group('ApiService Tests', () {
    late ApiService apiService;

    setUp(() {
      ApiService.reset();
      SharedPreferences.setMockInitialValues({});
      mockSecureStorage.clear();
    });

    test('Tenant storage works', () async {
      // Use real client for this test as it doesn't call API
      apiService = ApiService(client: http.Client());
      await apiService.setTenant('company1');
      final tenant = await apiService.getTenant();
      expect(tenant, 'company1');
    });

    test('login sends correct payload and saves token', () async {
      final mockClient = MockClient((request) async {
        if (request.url.path.contains('/auth/login/')) {
          return http.Response(jsonEncode({'token': 'fake-jwt-token'}), 200);
        }
        return http.Response('Not Found: ${request.url.path}', 404);
      });

      apiService = ApiService(client: mockClient);
      final result = await apiService.login('test@test.com', 'pass123', 'perusahaan1');

      expect(result['token'], 'fake-jwt-token');
      expect(mockSecureStorage['jwt_token'], 'fake-jwt-token');
      
      final savedTenant = await apiService.getTenant();
      expect(savedTenant, 'perusahaan1');
    });

    test('login throws exception on failure', () async {
      final mockClient = MockClient((request) async {
        return http.Response('Invalid credentials', 401);
      });

      apiService = ApiService(client: mockClient);
      
      expect(
        () => apiService.login('bad@test.com', 'wrong', 'tenant'),
        throwsA(isA<Exception>()),
      );
    });

    test('getUserProfile returns parsed JSON on success', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode({'id': 1, 'fullname': 'Afdhal'}), 200);
      });

      apiService = ApiService(client: mockClient);
      final profile = await apiService.getUserProfile();
      expect(profile['fullname'], 'Afdhal');
    });

    test('User.fromJson parses flattened backend response', () {
      final json = {
        "id": 1,
        "email": "admin@company1.harikerja.com",
        "is_staff": true,
        "employee_id": 1,
        "employee_nik": "EMP-001",
        "fullname": "Admin User",
        "role_name": "Senior HR Manager",
        "department_name": "Human Resources"
      };

      final user = User.fromJson(json);

      expect(user.id, 1);
      expect(user.fullname, "Admin User");
      expect(user.employeeNik, "EMP-001");
      expect(user.roleName, "Senior HR Manager");
    });

    test('getLeaveRequests returns list', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode([{'id': 1, 'leave_type': 'CUTI', 'start_date': '2026-06-01', 'end_date': '2026-06-02', 'reason': 'Vacation', 'status': 'PENDING'}]), 200);
      });
      apiService = ApiService(client: mockClient);
      final list = await apiService.getLeaveRequests();
      expect(list.length, 1);
      expect(list[0]['leave_type'], 'CUTI');
    });

    test('getReimbursements returns list', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode([{'id': 1, 'amount': 50000, 'date': '2026-05-20', 'description': 'Taxi', 'status': 'PENDING', 'category': {'id': 1, 'name': 'Transport'}}]), 200);
      });
      apiService = ApiService(client: mockClient);
      final list = await apiService.getReimbursements();
      expect(list.length, 1);
      expect(list[0]['amount'], 50000);
    });
  });
}
