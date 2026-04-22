import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'package:mobile/l10n/app_localizations_en.dart';
import 'package:mobile/l10n/app_localizations_id.dart';

void main() {
  group('AppLocalizations values', () {
    test('English localization returns expected strings', () {
      final en = AppLocalizationsEn();
      expect(en.login, 'Login');
      expect(en.appTitle, 'HRMS Mobile');
      expect(en.welcome, 'Welcome back');
      expect(en.clockInTime, 'Clock In Time');
      expect(en.yesterday, 'Yesterday');
    });

    test('Indonesian localization returns expected strings', () {
      final id = AppLocalizationsId();
      expect(id.login, 'Masuk');
      expect(id.appSubtitle, 'Portal Karyawan Aman');
      expect(id.clockOutTime, 'Waktu Pulang');
      expect(id.leaves, 'Cuti');
      expect(id.performance, 'Performa');
    });

    test('AppLocalizations: Profile translations', () {
      final en = AppLocalizationsEn();
      final id = AppLocalizationsId();
      expect(en.profile, 'Profile');
      expect(id.profile, 'Profil');
    });

    test('AppLocalizations: Attendance translations', () {
      final en = AppLocalizationsEn();
      final id = AppLocalizationsId();
      expect(en.clockIn, 'Clock In');
      expect(id.clockIn, 'Absen Masuk');
    });

    test('AppLocalizations: Generic translations', () {
      final en = AppLocalizationsEn();
      final id = AppLocalizationsId();
      expect(en.error, 'Error');
      expect(id.error, 'Kesalahan');
    });
  });
}
