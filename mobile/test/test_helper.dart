import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';

class MyHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
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

Future<void> loginForTest() async {
  final api = ApiService();
  await api.login('admin@company1.com', 'password123', 'company1');
}

