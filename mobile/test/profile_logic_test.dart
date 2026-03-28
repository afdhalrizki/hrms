import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/api_service.dart';
import 'test_helper.dart';

void main() {
  group('Phase M2: Profile & Documents Tests (Mocked)', () {
    late ApiService apiService;

    setUp(() async {
      await setupMockApiService();
      apiService = ApiService();
    });

    test('updateProfile sends PATCH successfully', () async {
      await loginForTest();
      await apiService.updateProfile(101, {'phone': '08123456789'});
    });

    test('uploadDocument sends multipart request successfully', () async {
      await loginForTest();
      await apiService.uploadDocument(101, 'ktp_image', [1, 2, 3], 'test.jpg');
    });
  });
}
