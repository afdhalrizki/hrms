import 'dart:io';
import 'dart:convert';
import 'file_service.dart';
import 'package:http/http.dart' as http;
import '../models/user_model.dart';
import '../models/schedule_model.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static String get baseUrl {
    // Detect environment from build mode or custom define
    const String env = String.fromEnvironment('APP_ENV', defaultValue: 'dev');
    
    switch (env) {
      case 'qa': return "https://qa.harikerja.web.id/api";
      case 'staging': return "https://staging.harikerja.web.id/api";
      case 'prod': return "https://harikerja.com/api";
      default:
        if (kIsWeb || Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
          return "http://127.0.0.1:8000/api";
        }
        return "http://10.0.2.2:8000/api";
    }
  }

  static String get domainSuffix {
    const String env = String.fromEnvironment('APP_ENV', defaultValue: 'dev');
    switch (env) {
      case 'qa': return "qa.harikerja.web.id";
      case 'staging': return "staging.harikerja.web.id";
      case 'prod': return "harikerja.com";
      default: return "localhost";
    }
  }

  static String get hostSuffix {
     const String env = String.fromEnvironment('APP_ENV', defaultValue: 'dev');
     if (env == 'dev') return ":8000";
     return "";
  }
  
  final _storage = const FlutterSecureStorage();
  final http.Client _client;
  
  // Singleton pattern with internal constructor
  static ApiService? _instance;
  
  static void reset() {
    _instance = null;
  }

  factory ApiService({http.Client? client}) {
    _instance ??= ApiService._internal(client ?? http.Client());
    return _instance!;
  }
  
  ApiService._internal(this._client);
  
  void _log(String message) {
    if (const bool.fromEnvironment('dart.vm.product')) return;
    if (Platform.environment.containsKey('FLUTTER_TEST')) return;
    debugPrint(message);
  }

  Future<String?> getTenant() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('tenant_subdomain');
  }

  Future<void> setTenant(String subdomain) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('tenant_subdomain', subdomain);
  }

  Map<String, String> _headers(String? tenant, [String? token]) {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (tenant != null) {
      // Use dynamic domain suffix based on environment
      headers['X-Tenant-Domain'] = "$tenant.$domainSuffix";
      // Manually set Host header so django-tenants can identify the schema
      headers['Host'] = "$tenant.$domainSuffix$hostSuffix";
    }
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> login(String email, String password, String tenant) async {
    final headers = _headers(tenant);
    
    debugPrint('HTTP REQUEST: POST $baseUrl/auth/login/');
    debugPrint('HTTP HEADERS: $headers');
    
    final response = await _client.post(
      Uri.parse("$baseUrl/auth/login/"),
      headers: headers,
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    ).timeout(const Duration(seconds: 30));

    debugPrint('HTTP RESPONSE: ${response.statusCode}');

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      // Backend returns 'access' and 'refresh' keys now
      await _storage.write(key: 'jwt_token', value: data['access'] ?? data['token']);
      await _storage.write(key: 'refresh_token', value: data['refresh']);
      await _storage.write(key: 'tenant', value: tenant);
      await setTenant(tenant);
      return data;
    } else {
      throw Exception('Failed to login: ${response.body}');
    }
  }

  Future<bool> refreshToken() async {
    final tenant = await getTenant();
    final refreshToken = await _storage.read(key: 'refresh_token');
    
    if (refreshToken == null) return false;

    try {
      print('DEBUG E2E: Refreshing token...');
      final response = await _client.post(
        Uri.parse('$baseUrl/auth/token/refresh/'),
        headers: _headers(tenant),
        body: jsonEncode({'refresh': refreshToken}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storage.write(key: 'jwt_token', value: data['access']);
        return true;
      }
    } catch (e) {
    }
    return false;
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  Future<bool> hasValidToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
  }

  // Cross-platform file downloader
  Future<List<int>> downloadFile(String endpoint, {Map<String, dynamic>? queryParams}) async {
    final tenant = await getTenant();
    final token = await getToken();
    
    var url = "$baseUrl$endpoint";
    if (queryParams != null && queryParams.isNotEmpty) {
      final queryString = Uri(queryParameters: queryParams.map((k, v) => MapEntry(k, v.toString()))).query;
      url = "$url?$queryString";
    }
    
    _log('STARTING DOWNLOAD: $url');
    
    final response = await _client.get(
      Uri.parse(url),
      headers: _headers(tenant, token),
    );

    if (response.statusCode == 200) {
      _log('File Downloaded successfully: ${response.bodyBytes.length} bytes');
      return response.bodyBytes;
    } else {
      _log('DOWNLOAD FAILED: ${response.statusCode} - ${response.body}');
      throw Exception('Failed to download file: ${response.statusCode}');
    }
  }

  Future<List<int>> downloadAttendanceRecap(String startDate, String endDate, String format) async {
    final endpoint = format == 'pdf' ? '/attendance/download_pdf/' : '/attendance/export_$format/';
    
    // Extract month and year from startDate (YYYY-MM-DD)
    final parts = startDate.split('-');
    final year = parts[0];
    final month = parts[1].startsWith('0') ? parts[1].substring(1) : parts[1];

    return await downloadFile(endpoint, queryParams: {
      'month': month,
      'year': year,
    });
  }

  Future<List<int>> downloadPayrollRecap(int periodId, String format) async {
    return await downloadFile("/payslips/export_recap_$format/", queryParams: {
      'period_id': periodId,
    });
  }

  Future<List<int>> downloadReimbursementRecap(String format) async {
    return await downloadFile("/reimbursements/export_$format/");
  }

  Future<List<int>> downloadPerformanceRecap(String format) async {
    return await downloadFile("/appraisals/export_$format/");
  }

  Future<List<int>> downloadPayslipPDF(int payslipId) async {
    return await downloadFile("/payslips/$payslipId/download_pdf/");
  }

  Future<List<int>> downloadPayslipDOCX(int payslipId) async {
    return await downloadFile("/payslips/$payslipId/download_docx/");
  }

  Future<List<int>> downloadReimbursementPDF(int reimbursementId) async {
    return await downloadFile("/reimbursements/$reimbursementId/download_pdf/");
  }

  Future<List<int>> downloadReimbursementDOCX(int reimbursementId) async {
    return await downloadFile("/reimbursements/$reimbursementId/download_docx/");
  }

  Future<List<int>> downloadAppraisalPDF(int appraisalId) async {
    return await downloadFile("/appraisals/$appraisalId/download_pdf/");
  }

  Future<http.Response> _authenticatedRequest(
    Future<http.Response> Function(String? token) requestBuilder,
  ) async {
    final tenant = await getTenant();
    var token = await getToken();
    
    _log('AUTHENTICATED REQUEST START: $token');
    
    var response = await requestBuilder(token).timeout(
      const Duration(seconds: 30),
      onTimeout: () {
        _log('TIMEOUT ERROR: Request timed out after 30s');
        throw Exception('Request timed out after 30 seconds');
      },
    );
    
    _log('AUTHENTICATED REQUEST RESPONSE: ${response.statusCode}');
    if (response.statusCode >= 400) {
      _log('HTTP ERROR BODY: ${response.body}');
    }
    
    if (response.statusCode == 401) {
      _log('GOT 401, ATTEMPTING TOKEN REFRESH');
      final success = await refreshToken();
      if (success) {
        token = await getToken();
        response = await requestBuilder(token);
        _log('REFRESHED REQUEST RESPONSE: ${response.statusCode}');
      }
    }
    
    return response;

  }

  Future<User> getUserProfile() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/users/me/"),
      headers: _headers(tenant, token),
    ));

    if (response.statusCode == 200) {
      return User.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to fetch user profile: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> getEmployeeProfile() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/employees/"),
      headers: _headers(tenant, token),
    ));

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      if (data.isNotEmpty) {
        // Return the first record (self-filtered by backend queryset)
        final employee = data.first;
        // Map 'id' to 'employee_id' for consistency in the app
        employee['employee_id'] = employee['id'];
        return employee;
      }
      throw Exception('No employee profile found');
    } else {
      throw Exception('Failed to fetch employee profile: ${response.body}');
    }
  }

  Future<Map<String, dynamic>> submitAttendance({
    required int employeeId,
    required double latitude,
    required double longitude,
    required String checkTime,
    bool isClockIn = true,
    String? date,
  }) async {
    final tenant = await getTenant();
    final payload = {
      'employee': employeeId,
      'platform': 'mobile',
      if (date != null) 'date': date,
    };

    if (isClockIn) {
      payload['latitude_in'] = latitude;
      payload['longitude_in'] = longitude;
      payload['check_in'] = checkTime;
    } else {
      payload['latitude_out'] = latitude;
      payload['longitude_out'] = longitude;
      payload['check_out'] = checkTime;
    }

    final response = await _authenticatedRequest((token) => _client.post(
      Uri.parse("$baseUrl/attendance/"),
      headers: _headers(tenant, token),
      body: jsonEncode(payload),
    ));

    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to submit attendance: ${response.body}');
    }
  }

  Future<List<Schedule>> getMySchedules() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/schedules/"),
      headers: _headers(tenant, token),
    ));

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Schedule.fromJson(json)).toList();
    } else {
      throw Exception('Failed to fetch schedules');
    }
  }

  // Phase 2: Leave Management
  Future<List<dynamic>> getLeaveRequests() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/leave-requests/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch leave requests');
  }

  Future<void> applyLeave(Map<String, dynamic> data) async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.post(
      Uri.parse("$baseUrl/leave-requests/"),
      headers: _headers(tenant, token),
      body: jsonEncode(data),
    ));
    if (response.statusCode != 201) throw Exception('Failed to apply leave: ${response.body}');
  }

  Future<void> updateLeaveStatus(int id, String action, String comment) async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.patch(
      Uri.parse("$baseUrl/leave-requests/$id/"),
      headers: _headers(tenant, token),
      body: jsonEncode({
        'action': action,
        'comment': comment,
      }),
    ));
    if (response.statusCode != 200) throw Exception('Failed to update leave status: ${response.body}');
  }

  Future<List<dynamic>> getLeaveBalances() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/leave-balances/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch leave balance');
  }

  // Phase 2: Reimbursements
  Future<List<dynamic>> getReimbursements() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/reimbursements/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch reimbursements');
  }

  Future<List<dynamic>> getReimbursementCategories() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/reimbursement-categories/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch reimbursement categories');
  }

  Future<void> applyReimbursement(Map<String, dynamic> data) async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.post(
      Uri.parse("$baseUrl/reimbursements/"),
      headers: _headers(tenant, token),
      body: jsonEncode(data),
    ));
    if (response.statusCode != 201) throw Exception('Failed to submit reimbursement: ${response.body}');
  }

  Future<void> updateReimbursementStatus(int id, String action, String comment) async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.post(
      Uri.parse("$baseUrl/reimbursements/$id/process_action/"),
      headers: _headers(tenant, token),
      body: jsonEncode({
        'action': action,
        'comment': comment,
      }),
    ));
    if (response.statusCode != 200) throw Exception('Failed to update reimbursement status: ${response.body}');
  }

  // Phase M2: Profile & Documents
  Future<Map<String, dynamic>> updateProfile(int employeeId, Map<String, dynamic> data) async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.patch(
      Uri.parse("$baseUrl/employees/$employeeId/"),
      headers: _headers(tenant, token),
      body: jsonEncode(data),
    ));

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to update profile: ${response.body}');
    }
  }

  Future<void> uploadDocument(int employeeId, String fieldName, List<int> bytes, String fileName) async {
    final tenant = await getTenant();
    final token = await getToken();
    
    final request = http.MultipartRequest(
      'PATCH',
      Uri.parse("$baseUrl/employees/$employeeId/"),
    );
    
    request.headers.addAll(_headers(tenant, token));
    
    request.files.add(http.MultipartFile.fromBytes(
      fieldName,
      bytes,
      filename: fileName,
    ));

    final streamedResponse = await _client.send(request);
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode != 200) {
      print('DEBUG E2E: Response error for uploadDocument: ${response.statusCode} - ${response.body}');
      throw Exception('Failed to upload document: ${response.body}');
    }
  }

  // Phase M3: Attendance Corrections
  Future<List<dynamic>> getAttendanceRecords() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/attendance/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch attendance history');
  }

  Future<List<dynamic>> getCorrectionRequests() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/attendance-corrections/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch correction requests');
  }

  Future<void> submitCorrectionRequest(Map<String, dynamic> data) async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.post(
      Uri.parse("$baseUrl/attendance-corrections/"),
      headers: _headers(tenant, token),
      body: jsonEncode(data),
    ));
    if (response.statusCode != 201) {
       throw Exception('Failed to submit correction: ${response.body}');
    }
  }

  Future<void> updateCorrectionStatus(int id, String action, String comment) async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.patch(
      Uri.parse("$baseUrl/attendance-corrections/$id/"),
      headers: _headers(tenant, token),
      body: jsonEncode({
        'action': action,
        'comment': comment,
      }),
    ));
    if (response.statusCode != 200) throw Exception('Failed to update correction status: ${response.body}');
  }

  Future<List<dynamic>> getOvertimes() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/overtime/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch overtimes');
  }

  Future<void> applyOvertime(Map<String, dynamic> data) async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.post(
      Uri.parse("$baseUrl/overtime/"),
      headers: _headers(tenant, token),
      body: jsonEncode(data),
    ));
    if (response.statusCode != 201) throw Exception('Failed to apply overtime: ${response.body}');
  }

  // Phase M4: Strategic Performance
  Future<List<dynamic>> getKPITargets() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/kpi-targets/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch KPI targets');
  }

  Future<List<dynamic>> getAppraisals() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/appraisals/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch appraisals');
  }

  // Phase M7: Payslips & Hardening
  Future<List<dynamic>> getPayslips() async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.get(
      Uri.parse("$baseUrl/payslips/"),
      headers: _headers(tenant, token),
    ));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to fetch payslips');
  }

  Future<void> submitAppraisalReview(Map<String, dynamic> data) async {
    final tenant = await getTenant();
    final response = await _authenticatedRequest((token) => _client.post(
      Uri.parse("$baseUrl/appraisal-reviews/"),
      headers: _headers(tenant, token),
      body: jsonEncode(data),
    ));
    if (response.statusCode != 201) {
       throw Exception('Failed to submit review: ${response.body}');
    }
  }
}
