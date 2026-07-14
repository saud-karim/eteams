import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  static String get baseUrl => dotenv.env['API_URL'] ?? 'http://10.0.2.2:4000';
  static String get socketUrl => dotenv.env['SOCKET_URL'] ?? 'http://10.0.2.2:4000';
}
