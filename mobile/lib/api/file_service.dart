import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'package:flutter/foundation.dart';

class FileService {
  static Future<void> openBytes(List<int> bytes, String fileName) async {
    if (kIsWeb) {
       // Web implementation would use anchor element download, but we focus on mobile hardening
       print("PDF opening not supported on web in this implementation");
       return;
    }

    try {
      final directory = await getApplicationDocumentsDirectory();
      final file = File('${directory.path}/$fileName');
      await file.writeAsBytes(bytes);
      await OpenFilex.open(file.path);
    } catch (e) {
      debugPrint('Error saving/opening file: $e');
      rethrow;
    }
  }
}
