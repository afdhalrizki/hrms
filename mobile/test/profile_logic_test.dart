import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
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
        }
        return null;
      },
    );
  });

  group('Phase M2: Profile & Documents Tests', () {
    late ApiService apiService;

    setUp(() {
      ApiService.reset();
      SharedPreferences.setMockInitialValues({});
      mockSecureStorage.clear();
    });

    test('updateProfile sends PATCH request with correct body', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'PATCH');
        expect(request.url.path, '/api/employees/1/');
        final body = jsonDecode(request.body);
        expect(body['phone'], '08123456789');
        return http.Response(jsonEncode({'success': true}), 200);
      });

      apiService = ApiService(client: mockClient);
      await apiService.setTenant('company1');
      await apiService.updateProfile(1, {'phone': '08123456789'});
    });

    test('uploadDocument sends multipart request', () async {
      final mockClient = MockClient((request) async {
        // http.MultipartRequest doesn't easily show body in MockClient request
        // but we can verify it's a POST/PATCH to the right URL
        expect(request.method, 'PATCH');
        expect(request.url.path, '/api/employees/1/');
        return http.Response(jsonEncode({'success': true}), 200);
      });

      apiService = ApiService(client: mockClient);
      await apiService.setTenant('company1');
      await apiService.uploadDocument(1, 'ktp_image', [1, 2, 3], 'test.jpg');
    });
  });
}
