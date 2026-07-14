import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  static Future<User> login(String email, String password) async {
    final r = await ApiService.login(email, password);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('accessToken', r['accessToken']);
    await prefs.setString('refreshToken', r['refreshToken']);
    return User.fromJson(r['user']);
  }

  static Future<User?> restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getString('accessToken') == null) return null;
    try { return await ApiService.me(); }
    catch (_) { await logout(); return null; }
  }

  static Future<void> logout() async {
    try { await ApiService.logout(); } catch (_) {}
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('refreshToken');
  }
}
