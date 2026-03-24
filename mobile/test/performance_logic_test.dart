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
        if (methodCall.method == 'read') return mockSecureStorage[methodCall.arguments['key']];
        return null;
      },
    );
  });

  group('Phase M4: Strategic Performance Tests', () {
    late ApiService apiService;

    setUp(() {
      ApiService.reset();
      SharedPreferences.setMockInitialValues({});
    });

    test('getKPITargets returns list on success', () async {
      final mockClient = MockClient((request) async {
        return http.Response(jsonEncode([{'id': 1, 'kpi_name': 'Sales', 'target_value': 100, 'actual_value': 50}]), 200);
      });
      apiService = ApiService(client: mockClient);
      await apiService.setTenant('company1');
      final list = await apiService.getKPITargets();
      expect(list.length, 1);
      expect(list[0]['kpi_name'], 'Sales');
    });

    test('submitAppraisalReview sends POST with correct payload', () async {
      final mockClient = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/api/appraisal-reviews/');
        final body = jsonDecode(request.body);
        expect(body['reviewer_type'], 'SELF');
        expect(body['ratings']['quality'], 4);
        return http.Response(jsonEncode({'id': 1}), 201);
      });
      apiService = ApiService(client: mockClient);
      await apiService.setTenant('company1');
      await apiService.submitAppraisalReview({
        'appraisal': 1,
        'reviewer': 10,
        'reviewer_type': 'SELF',
        'ratings': {'quality': 4},
        'comments': 'Great job',
      });
    });
  });
}
