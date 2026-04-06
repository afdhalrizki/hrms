import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile/l10n/app_localizations.dart';

void initTestHttpOverrides() {}

class FakeCameraController extends Fake {
  @override
  dynamic get value => _FakeValue();
  Future<void> initialize() async {}
  Future<void> startImageStream(dynamic onAvailable) async {}
  Future<void> stopImageStream() async {}
  Future<void> dispose() async {}
  Future<dynamic> takePicture() async => null;
  void debugCheckIsDisposed() {}
  bool get wasDisposed => false;
}

class _FakeValue {
  bool get isInitialized => true;
  bool get isReady => true;
  double get aspectRatio => 1.0;
}

Map<String, String> mockSecureStorage = {};
bool mockErrorStatus = false;
bool mockEmptyResponse = false;
String mockErrorMessage = 'Error';

void setupSystemChannelMocks() {
  const MethodChannel secureStorageChannel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  const MethodChannel pathProviderChannel = MethodChannel('plugins.flutter.io/path_provider');
  const MethodChannel textInputChannel = MethodChannel('flutter/textinput', JSONMethodCodec());
  const MethodChannel platformViewsChannel = MethodChannel('flutter/platform_views');

  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  messenger.setMockMethodCallHandler(secureStorageChannel, (call) async {
    if (call.method == 'read') {
      return Future.value(mockSecureStorage[call.arguments['key']]);
    } else if (call.method == 'write') {
      mockSecureStorage[call.arguments['key']] = call.arguments['value'];
    } else if (call.method == 'delete') {
      mockSecureStorage.remove(call.arguments['key']);
    } else if (call.method == 'deleteAll') {
      mockSecureStorage.clear();
    }
    return Future.value(null);
  });

  messenger.setMockMethodCallHandler(pathProviderChannel, (call) async {
    if (call.method == 'getApplicationDocumentsDirectory') return Future.value('.');
    return Future.value(null);
  });

  messenger.setMockMethodCallHandler(textInputChannel, (call) async => Future.value(null));
  messenger.setMockMethodCallHandler(platformViewsChannel, (call) async => Future.value(null));
}

/// Route a URL to the correct mock response with proper status codes.
/// 
/// Key status code mapping (from ApiService source):
///   - login:                  POST → 200
///   - submitAttendance:       POST → 201
///   - applyLeave:             POST → 201
///   - applyReimbursement:     POST → 201
///   - submitCorrectionRequest:POST → 201
///   - submitAppraisalReview:  POST → 201
///   - updateProfile:          PATCH → 200
///   - uploadDocument:         PATCH (multipart) → 200
///   - All GET endpoints:      → 200
http.Client getMockClient() {
  return MockClient((request) async {
    final method = request.method.toUpperCase();
    final url = request.url.toString().toLowerCase();
    final h = {'content-type': 'application/json'};

    if (mockErrorStatus) {
      return http.Response(jsonEncode({'error': mockErrorMessage}), 500, headers: h);
    }

    // --- Auth ---
    if (url.contains('login')) {
      final body = request is http.Request ? request.body : '';
      if (body.contains('wrong@company1.com')) {
        return http.Response(jsonEncode({'detail': 'Invalid credentials'}), 401, headers: h);
      }
      return http.Response(jsonEncode({'access': 'mock_access', 'refresh': 'mock_refresh'}), 200, headers: h);
    }
    if (url.contains('/auth/token/refresh')) {
      return http.Response(jsonEncode({'access': 'mock_refreshed_access'}), 200, headers: h);
    }

    // --- User Profile ---
    if (url.contains('/users/me')) {
      return http.Response(jsonEncode({
        'id': 1, 'fullname': 'Admin One', 'email': 'admin@company1.com', 'role_name': 'Employee'
      }), 200, headers: h);
    }

    // --- Attendance Corrections (must be before /attendance) ---
    if (url.contains('/attendance-corrections')) {
      if (method == 'POST') return http.Response(jsonEncode({'id': 1, 'status': 'PENDING'}), 201, headers: h);
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'attendance_date': '2026-04-06', 'status': 'PENDING',
         'requested_check_in': '08:00:00', 'requested_check_out': '17:00:00', 'reason': 'Test'}
      ]), 200, headers: h);
    }

    // --- Attendance ---
    if (url.contains('/attendance')) {
      if (method == 'POST') return http.Response(jsonEncode({'id': 1, 'status': 'success'}), 201, headers: h);
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'date': '2026-04-06', 'check_in': '08:00:10', 'check_out': null,
         'latitude_in': -6.2, 'longitude_in': 106.8}
      ]), 200, headers: h);
    }

    // --- Leave Requests: POST must return 201 ---
    if (url.contains('/leave-requests')) {
      if (method == 'POST') return http.Response(jsonEncode({'id': 2, 'status': 'PENDING'}), 201, headers: h);
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'status': 'APPROVED', 'leave_type_name': 'Annual Leave',
         'start_date': '2026-04-01', 'end_date': '2026-04-02',
         'created_at': '2026-04-01T08:00:00Z'}
      ]), 200, headers: h);
    }

    // --- Leave Balances ---
    if (url.contains('/leave-balances')) {
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'leave_type': 'Annual', 'balance': 12}
      ]), 200, headers: h);
    }

    // --- Reimbursement Categories ---
    if (url.contains('/reimbursement-categories')) {
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'name': 'Transport'}
      ]), 200, headers: h);
    }

    // --- Reimbursements: POST must return 201 ---
    if (url.contains('/reimbursements')) {
      if (method == 'POST') return http.Response(jsonEncode({'id': 2, 'status': 'PENDING'}), 201, headers: h);
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'amount': 50000, 'status': 'PENDING'}
      ]), 200, headers: h);
    }

    // --- Payslips ---
    if (url.contains('/payslips')) {
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'period_name': 'April 2026', 'net_salary': '5000000',
         'paid_at': '2026-04-01'}
      ]), 200, headers: h);
    }

    // --- KPI Targets ---
    if (url.contains('/kpi-targets')) {
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'kpi_name': 'Target KPI', 'target_value': 100.0, 'actual_value': 85.0}
      ]), 200, headers: h);
    }

    // --- Appraisal Reviews: POST must return 201 ---
    if (url.contains('/appraisal-reviews')) {
      return http.Response(jsonEncode({'id': 1, 'status': 'submitted'}), 201, headers: h);
    }

    // --- Appraisals ---
    if (url.contains('/appraisals')) {
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'period_name': 'Q1 2026', 'status': 'DRAFT',
         'start_date': '2026-01-01', 'end_date': '2026-03-31'}
      ]), 200, headers: h);
    }

    // --- Employees: PATCH must return 200, GET returns list ---
    if (url.contains('/employees')) {
      final employeeData = {
        'id': 1, 'employee_id': 1, 'fullname': 'Admin One',
        'ktp_image': null, 'npwp_image': null, 'ptkp_status': 'TK/0'
      };
      if (method == 'PATCH') return http.Response(jsonEncode(employeeData), 200, headers: h);
      if (method == 'POST') return http.Response(jsonEncode(employeeData), 201, headers: h);
      return http.Response(jsonEncode([employeeData]), 200, headers: h);
    }

    // --- Schedules ---
    if (url.contains('/schedules')) {
      return http.Response(jsonEncode(mockEmptyResponse ? [] : [
        {'id': 1, 'date': '2026-04-01', 'employee_name': 'Admin One',
         'shift_detail': {'id': 1, 'name': 'Morning Shift',
          'start_time': '08:00:00', 'end_time': '17:00:00'}}
      ]), 200, headers: h);
    }

    // --- Catch-all ---
    return http.Response(jsonEncode([]), 200, headers: h);
  });
}

Future<void> setupMockApiService({bool isWidgetTest = false}) async {
  final binding = TestWidgetsFlutterBinding.ensureInitialized();
  if (isWidgetTest) {
    binding.platformDispatcher.views.first.physicalSize = const Size(1080, 2400);
    binding.platformDispatcher.views.first.devicePixelRatio = 1.0;
  }

  // Reset singleton and inject mock client
  ApiService.reset();
  ApiService(client: getMockClient());

  // SharedPreferences is used by getTenant() — must set tenant_subdomain here
  SharedPreferences.setMockInitialValues({});
  setupSystemChannelMocks();
  GoogleFonts.config.allowRuntimeFetching = false;
  mockSecureStorage.clear();
  mockEmptyResponse = mockErrorStatus = false;
}

Future<void> tearDownMockApiService() async {
  if (TestWidgetsFlutterBinding.instance.platformDispatcher.views.isNotEmpty) {
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first.resetPhysicalSize();
    TestWidgetsFlutterBinding.instance.platformDispatcher.views.first.resetDevicePixelRatio();
  }
}

Future<void> setupIntegratedApiService() async {
  ApiService.reset();
  // Initializes ApiService with a real http.Client
  ApiService();
  SharedPreferences.setMockInitialValues({});
  setupSystemChannelMocks();
  GoogleFonts.config.allowRuntimeFetching = false;
  mockSecureStorage.clear();
}

/// Simulate a logged-in user by setting JWT token in secure storage
/// AND tenant_subdomain in SharedPreferences (which getTenant() reads).
Future<void> loginForTest() async {
  mockSecureStorage['jwt_token'] = 'mock_access';
  mockSecureStorage['tenant'] = 'company1';

  // getTenant() reads from SharedPreferences, NOT secure storage
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('tenant_subdomain', 'company1');
}
