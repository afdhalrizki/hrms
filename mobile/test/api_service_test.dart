import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:mobile/models/user_model.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:mockito/mockito.dart';

// Manual Mock because build_runner/symlinks are restricted
class MockClient extends Mock implements http.Client {
  @override
  Future<http.Response> get(Uri? url, {Map<String, String>? headers}) {
    return super.noSuchMethod(
      Invocation.method(#get, [url], {#headers: headers}),
      returnValue: Future.value(http.Response('', 200)),
    );
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ApiService Tests', () {
    late ApiService apiService;
    late MockClient mockClient;

    setUp(() {
      SharedPreferences.setMockInitialValues({});
      apiService = ApiService();
      mockClient = MockClient();
    });

    test('Tenant storage works', () async {
      await apiService.setTenant('company1');
      final tenant = await apiService.getTenant();
      expect(tenant, 'company1');
    });

    test('User.fromJson parses flattened backend response', () {
      final json = {
        "id": 1,
        "email": "admin@company1.localhost",
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
  });
}
