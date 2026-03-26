import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/models/user_model.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'test_helper.dart';

void main() {
  initRealBackendTest();

  setUpAll(() {
    setupSecureStorageMock();
  });

  group('ApiService Real Backend Tests', () {
    late ApiService apiService;

    setUp(() async {
      ApiService.reset();
      SharedPreferences.setMockInitialValues({});
      apiService = ApiService();
    });

    test('Tenant storage works', () async {
      await apiService.setTenant('company1');
      final tenant = await apiService.getTenant();
      expect(tenant, 'company1');
    });

    test('login sends real request and saves token', () async {
      final result = await apiService.login('admin@company1.com', 'password123', 'company1');

      expect(result['access'], isNotNull);
      final savedToken = await apiService.getToken();
      expect(savedToken, result['access']);
      
      final savedTenant = await apiService.getTenant();
      expect(savedTenant, 'company1');
    });

    test('login throws exception on failure', () async {
      expect(
        () => apiService.login('bad@test.com', 'wrong', 'tenant'),
        throwsException,
      );
    });

    test('getUserProfile returns parsed JSON from real backend', () async {
      await loginForTest();
      final profile = await apiService.getUserProfile();
      expect(profile['fullname'], isNotNull);
      expect(profile['email'], 'admin@company1.com');
    });

    test('User.fromJson parses flattened backend response', () {
      final json = {
        "id": 1,
        "email": "admin@company1.com",
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
    });

    test('getLeaveRequests returns list from real backend', () async {
      await loginForTest();
      final list = await apiService.getLeaveRequests();
      expect(list, isA<List>());
    });

    test('getReimbursements returns list from real backend', () async {
      await loginForTest();
      final list = await apiService.getReimbursements();
      expect(list, isA<List>());
    });
  });
}
