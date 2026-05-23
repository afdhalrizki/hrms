import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/utils/style_utils.dart';

void main() {
  group('Premium Light Olive Green Theme Unit Tests (Mobile)', () {
    test('should verify AppTheme uses premium light olive green design tokens', () {
      // 1. Scaffold background should be soothing sage cream (anti-silau)
      expect(AppTheme.scaffoldBackground, const Color(0xFFF3F6F0));

      // 2. Primary accent color should be the corporate rich olive green
      expect(AppTheme.primaryColor, const Color(0xFF588157));

      // 3. Card/surface background should be premium clean white
      expect(AppTheme.surfaceColor, const Color(0xFFFFFFFF));

      // 4. Text colors should be dark forest charcoal and muted sage
      expect(AppTheme.textForegroundColor, const Color(0xFF2C351F));
      expect(AppTheme.textMutedColor, const Color(0xFF5C6B4D));
    });

    test('should verify ThemeData correctly implements light olive configuration', () {
      final themeData = AppTheme.darkTheme;

      // 1. Brightness should be light (not dark)
      expect(themeData.brightness, Brightness.light);

      // 2. Primary color and backgrounds should map correctly
      expect(themeData.primaryColor, const Color(0xFF588157));
      expect(themeData.scaffoldBackgroundColor, const Color(0xFFF3F6F0));
      expect(themeData.cardColor, const Color(0xFFFFFFFF));

      // 3. Color scheme fields should be fully defined
      expect(themeData.colorScheme.primary, const Color(0xFF588157));
      expect(themeData.colorScheme.background, const Color(0xFFF3F6F0));
      expect(themeData.colorScheme.surface, const Color(0xFFFFFFFF));
      expect(themeData.colorScheme.onBackground, const Color(0xFF2C351F));
      expect(themeData.colorScheme.onSurface, const Color(0xFF2C351F));

      // 4. AppBar theme should be transparent sage with charcoal text
      expect(themeData.appBarTheme.backgroundColor, const Color(0xFFF3F6F0));
      expect(themeData.appBarTheme.foregroundColor, const Color(0xFF2C351F));
      expect(themeData.appBarTheme.elevation, 0);
    });
  });
}
