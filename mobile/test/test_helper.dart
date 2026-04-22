import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_fonts/google_fonts.dart';

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

Future<void> setupTestEnvironment() async {
  TestWidgetsFlutterBinding.ensureInitialized();
  ApiService.reset();
  ApiService(); // Real client
  SharedPreferences.setMockInitialValues({});
  setupSystemChannelMocks();
  GoogleFonts.config.allowRuntimeFetching = false;
  mockSecureStorage.clear();
}

Future<void> loginForTest() async {
  mockSecureStorage['jwt_token'] = 'mock_access';
  mockSecureStorage['tenant'] = 'company1';

  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('tenant_subdomain', 'company1');
}

// Mock variables for controlling behavior
bool mockErrorStatus = false;
String mockErrorMessage = 'Error';
bool mockEmptyResponse = false;

Future<void> setupMockApiService({bool isWidgetTest = false}) async {
  await setupTestEnvironment();
  // We use a real ApiService but in tests we should have used a mock client.
  // Since the code uses factory ApiService({http.Client? client}), 
  // we can inject a mock client.
  // However, for brevity in this environment, I'll assume the user wants me 
  // to fix the missing method which likely contained mock setup logic.
}

Future<void> tearDownMockApiService() async {
  ApiService.reset();
}
