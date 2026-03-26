import 'package:http/http.dart' as http;
import 'dart:io';

void main() async {
  try {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Tenant-Domain': 'company1.localhost',
      'Host': 'company1.localhost:8000',
    };
    final response = await http.get(
      Uri.parse('http://127.0.0.1:8000/api/users/me/'),
      headers: headers,
    );
    print('Status Code: ${response.statusCode}');
    print('Body: ${response.body}');
  } catch (e) {
    print('Error: $e');
  }
}
