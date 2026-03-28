import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/models/user_model.dart';
import 'test_helper.dart';

void main() {
  group('ApiService Unit Tests (Mocked)', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
    });

    test('Tenant storage works', () async {
      await apiService.setTenant('company1');
      final tenant = await apiService.getTenant();
      expect(tenant, 'company1');
    });

    test('login saves tokens from mock response', () async {
      final result = await apiService.login('admin@company1.com', 'password123', 'company1');

      expect(result['access'], 'mock_access');
      final savedToken = await apiService.getToken();
      expect(savedToken, 'mock_access');
      
      final savedTenant = await apiService.getTenant();
      expect(savedTenant, 'company1');
    });

    test('getUserProfile returns parsed JSON from mock', () async {
      await loginForTest();
      final profile = await apiService.getUserProfile();
      expect(profile['fullname'], 'Admin One');
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

    test('getLeaveRequests returns list from mock', () async {
      await loginForTest();
      final list = await apiService.getLeaveRequests();
      expect(list, isA<List>());
    });

    test('getReimbursements returns list from mock', () async {
      await loginForTest();
      final list = await apiService.getReimbursements();
      expect(list, isA<List>());
    });
  });
}
