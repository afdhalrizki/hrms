import 'dart:io';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_fonts/google_fonts.dart';

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }

  @override
  String findProxyFromEnvironment(Uri url, Map<String, String>? environment) {
    return 'DIRECT';
  }
}

void initTestHttpOverrides() {
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

  const MethodChannel pathChannel = MethodChannel('plugins.flutter.io/path_provider');
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
    pathChannel,
    (MethodCall methodCall) async {
      if (methodCall.method == 'getApplicationDocumentsDirectory') {
        return '.';
      }
      return null;
    },
  );
}

final Map<String, dynamic> mockAttendanceState = {
  'activeRecord': null,
  'records': [],
};
final Map<String, dynamic> mockKpiState = {
  'targets': [],
};
final Map<String, dynamic> mockAppraisalState = {
  'periods': [],
};
final Map<String, dynamic> mockCorrectionState = {
  'requests': [],
};
final Map<String, dynamic> mockLeaveState = {
  'requests': [],
  'balances': [],
};
final Map<String, dynamic> mockPayslipState = {
  'payslips': [],
};
final Map<String, dynamic> mockScheduleState = {
  'schedules': [],
};
final Map<String, dynamic> mockReimbursementState = {
  'requests': [],
  'categories': [],
};

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
          // Toggle state for lifecycle test
          if (mockAttendanceState['activeRecord'] == null) {
            mockAttendanceState['activeRecord'] = {
              'id': 1,
              'date': '2026-04-01',
              'check_in': '08:00:00',
              'check_out': null,
              'latitude_in': -6.2,
              'longitude_in': 106.8
            };
          } else {
            mockAttendanceState['activeRecord']!['check_out'] = '17:00:00';
            // In a real app we'd move it to records or just mark it closed.
            // For the test, we'll just keep it in activeRecord but with check_out set.
          }
          return http.Response(jsonEncode({'status': 'success', 'is_late': false}), 201);
       }
       
       final List<Map<String, dynamic>> result = List.from(mockAttendanceState['records']);
       if (mockAttendanceState['activeRecord'] != null) {
         result.insert(0, mockAttendanceState['activeRecord']!);
       }
       return http.Response(jsonEncode(result), 200);
    }

    if (path.contains('kpi-targets')) {
      if (method == 'POST') return http.Response(jsonEncode({'status': 'success'}), 201);
      return http.Response(jsonEncode(mockKpiState['targets']), 200);
    }

    if (path.contains('appraisal')) {
      if (method == 'POST') return http.Response(jsonEncode({'status': 'success'}), 201);
      return http.Response(jsonEncode(mockAppraisalState['periods']), 200);
    }

    if (path.contains('/attendance-correction-requests')) {
      if (method == 'POST') {
        return http.Response(jsonEncode({'status': 'success'}), 201);
      }
      return http.Response(jsonEncode(mockCorrectionState['requests']), 200);
    }

    if (path.contains('/leave-requests')) {
      if (method == 'POST') {
        final body = jsonDecode(request.body);
        if (body.isEmpty) return http.Response(jsonEncode({'error': 'Empty payload'}), 400);
        return http.Response(jsonEncode({'id': 99, 'status': 'PENDING'}), 201);
      }
      return http.Response(jsonEncode(mockLeaveState['requests']), 200);
    }
    if (path.contains('/leave-balances')) {
      return http.Response(jsonEncode(mockLeaveState['balances']), 200);
    }
    if (path.contains('/payslips')) {
      return http.Response(jsonEncode(mockPayslipState['payslips']), 200);
    }
    if (path.contains('/schedules')) {
      return http.Response(jsonEncode(mockScheduleState['schedules']), 200);
    }
    if (path.contains('/reimbursements')) {
      if (method == 'POST') {
        final body = jsonDecode(request.body);
        if (body.isEmpty) return http.Response(jsonEncode({'error': 'Empty payload'}), 400);
        return http.Response(jsonEncode({'status': 'success'}), 201);
      }
      return http.Response(jsonEncode(mockReimbursementState['requests']), 200);
    }
    if (path.contains('/reimbursement-categories')) {
      return http.Response(jsonEncode(mockReimbursementState['categories']), 200);
    }

    if (path.contains('/payroll') ||
        path.contains('/employees')) {
      
      if (method == 'POST' || method == 'PATCH') {
        Map<String, dynamic> body = {};
        try {
          if (request.body.isNotEmpty) {
            body = jsonDecode(request.body);
          }
        } catch (_) {}
        
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
  initTestHttpOverrides();
  
  // Disable GoogleFonts network fetching in all tests
  GoogleFonts.config.allowRuntimeFetching = false;
  
  ApiService.reset();
  ApiService(client: getMockClient());
  SharedPreferences.setMockInitialValues({});
  setupSecureStorageMock();
  mockSecureStorage.clear();
  
  // Reset all mock states
  mockAttendanceState['activeRecord'] = null;
  mockAttendanceState['records'] = [];
  mockKpiState['targets'] = [];
  mockAppraisalState['periods'] = [];
  mockCorrectionState['requests'] = [];
  mockLeaveState['requests'] = [];
  mockLeaveState['balances'] = [];
  mockPayslipState['payslips'] = [];
  mockScheduleState['schedules'] = [];
  mockReimbursementState['requests'] = [];
  mockReimbursementState['categories'] = [];
}

Future<void> loginForTest() async {
  mockSecureStorage['jwt_token'] = 'mock_access';
  mockSecureStorage['refresh_token'] = 'mock_refresh';
  mockSecureStorage['tenant'] = 'company1';
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('tenant_subdomain', 'company1');
}

