import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/api/location_service.dart';

void main() {
  group('LocationService', () {
    test('calculateDistance returns positive value for two different points', () {
      final service = LocationService();
      final distance = service.calculateDistance(0.0, 0.0, 0.0, 1.0);
      expect(distance, greaterThan(0));
    });

    test('calculateDistance returns zero for same point', () {
      final service = LocationService();
      final distance = service.calculateDistance(1.2345, 2.3456, 1.2345, 2.3456);
      expect(distance, equals(0));
    });
  });
}
