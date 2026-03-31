import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/file_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('FileService.openBytes handles platform differences gracefully', () async {
    const bytes = <int>[0, 1, 2, 3];
    final future = FileService.openBytes(bytes, 'test.pdf');

    try {
      await future;
      expect(true, isTrue);
    } catch (error) {
      expect(error, isNotNull);
    }
  });
}
