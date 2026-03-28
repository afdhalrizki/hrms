import 'dart:io';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void initRealBackendTest() {
  TestWidgetsFlutterBinding.ensureInitialized();
  HttpOverrides.global = MyHttpOverrides();
}

final Map<String, String> mockSecureStorage = {};

void setupSecureStorageMock() {
  const MethodChannel channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');

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
}

http.Client getMockClient() {
  return MockClient((request) async {
    final path = request.url.path;
    final method = request.method;

    if (path.contains('unknown') || path.contains('error')) {
      return http.Response(jsonEncode({'error': 'Not Found'}), 404);
    }

    if (path.contains('/auth/login/')) {
      return http.Response(jsonEncode({
        'access': 'mock_access',
        'refresh': 'mock_refresh',
      }), 200);
    }
    
    if (path.contains('/users/me/')) {
      return http.Response(jsonEncode({
        'id': 1,
        'email': 'admin@company1.com',
        'fullname': 'Admin One',
        'role_name': 'Admin',
        'employee_id': 101,
      }), 200);
    }
    
    if (path.contains('/attendance/')) {
      if (method == 'POST') {
        Map<String, dynamic> body = {};
        try {
          body = jsonDecode(request.body);
        } catch (_) {}
        
        // Simulation of Geofence: latitude -1.99 is "too far" in our mock logic
        if (body['latitude_in'] != null && body['latitude_in'] > -5.0) {
           return http.Response(jsonEncode({'error': 'Geofence failure'}), 400);
        }
        return http.Response(jsonEncode({'status': 'success', 'is_late': false}), 201);
      }
      return http.Response(jsonEncode([]), 200);
    }

    if (path.contains('/leave-requests') || 
        path.contains('/leave-balances') ||
        path.contains('/payslips') || 
        path.contains('/schedules') ||
        path.contains('/reimbursement') ||
        path.contains('/kpi-targets') ||
        path.contains('/appraisal') ||
        path.contains('/payroll') ||
        path.contains('/employees') ||
        path.contains('/attendance-correction-requests')) {
      
      if (method == 'POST' || method == 'PATCH') {
        Map<String, dynamic> body = {};
        try {
          if (request.body.isNotEmpty) {
            body = jsonDecode(request.body);
          }
        } catch (_) {
          // Non-JSON body (e.g. multipart), treat as success
          return http.Response(jsonEncode({'status': 'success'}), method == 'PATCH' ? 200 : 201);
        }
        
        if (body.isEmpty && !(path.contains('/employees/') || path.contains('/profile/'))) {
          return http.Response(jsonEncode({'error': 'Empty payload'}), 400);
        }
        return http.Response(jsonEncode({'status': 'success'}), method == 'PATCH' ? 200 : 201);
      }
      if (method == 'GET' && path.contains('/employees/')) {
         return http.Response(jsonEncode({'id': 101, 'employee_id': 101}), 200);
      }
      return http.Response(jsonEncode([]), 200);
    }
    
    return http.Response(jsonEncode({'error': 'Not Found'}), 404);
  });
}

Future<void> setupMockApiService() async {
  TestWidgetsFlutterBinding.ensureInitialized();
  ApiService.reset();
  ApiService(client: getMockClient());
  SharedPreferences.setMockInitialValues({});
  setupSecureStorageMock();
  mockSecureStorage.clear();
}

Future<void> loginForTest() async {
  mockSecureStorage['jwt_token'] = 'mock_access';
  mockSecureStorage['refresh_token'] = 'mock_refresh';
  mockSecureStorage['tenant'] = 'company1';
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('tenant_subdomain', 'company1');
}

