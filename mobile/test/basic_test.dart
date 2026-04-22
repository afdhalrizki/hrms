import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Basic arithmetic test', () {
    expect(2 + 2, 4);
  });

  test('String test: uppercase', () {
    expect("hello".toUpperCase(), "HELLO");
  });

  test('String test: contains', () {
    expect("hello world", contains("world"));
  });

  test('Math: multiplication', () {
    expect(5 * 5, 25);
  });

  test('Math: division', () {
    expect(10 / 2, 5.0);
  });

  test('Math: modulo', () {
    expect(10 % 3, 1);
  });

  test('Boolean: logic AND', () {
    expect(true && true, isTrue);
    expect(true && false, isFalse);
  });

  test('List: length and content', () {
    final list = [1, 2, 3];
    expect(list.length, 3);
    expect(list, contains(2));
  });
}