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
      mockClient = MockClient();
      // Injecting mock client via constructor
      apiService = ApiService(client: mockClient);
    });

    test('Tenant storage works', () async {
      await apiService.setTenant('company1');
      final tenant = await apiService.getTenant();
      expect(tenant, 'company1');
    });

    test('login sends correct payload and saves token', () async {
      final responseBody = jsonEncode({'token': 'fake-jwt-token'});
      
      when(mockClient.post(
        any,
        headers: anyNamed('headers'),
        body: anyNamed('body'),
      )).thenAnswer((_) async => http.Response(responseBody, 200));

      final result = await apiService.login('test@test.com', 'pass123', 'perusahaan1');

      expect(result['token'], 'fake-jwt-token');
      final savedToken = await apiService.getToken();
      expect(savedToken, 'fake-jwt-token');
      
      final savedTenant = await apiService.getTenant();
      expect(savedTenant, 'perusahaan1');
    });

    test('login throws exception on failure', () async {
      when(mockClient.post(
        any,
        headers: anyNamed('headers'),
        body: anyNamed('body'),
      )).thenAnswer((_) async => http.Response('Invalid credentials', 401));

      expect(
        () => apiService.login('bad@test.com', 'wrong', 'tenant'),
        throwsA(isA<Exception>()),
      );
    });

    test('getUserProfile returns parsed JSON on success', () async {
      final responseBody = jsonEncode({'id': 1, 'fullname': 'Afdhal'});
      
      when(mockClient.get(
        any,
        headers: anyNamed('headers'),
      )).thenAnswer((_) async => http.Response(responseBody, 200));

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
  });
}
