import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:mobile/l10n/app_localizations.dart';
import 'screens/login_screen.dart';
import 'utils/style_utils.dart';

void main() {
  runApp(const HRMSApp());
}

class HRMSApp extends StatelessWidget {
  final ThemeData? theme;
  final Locale? locale;
  const HRMSApp({super.key, this.theme, this.locale});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'harikerja Mobile',
      debugShowCheckedModeBanner: false,
      theme: theme ?? AppTheme.darkTheme,
      locale: locale,
      localizationsDelegates: [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en'), // English
        Locale('id'), // Indonesian
      ],
      home: const LoginScreen(),
    );
  }
}
