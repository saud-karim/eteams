import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _loading = true;

  User? get user => _user;
  bool get loading => _loading;
  bool get isAuthenticated => _user != null;

  Future<void> restore() async {
    _loading = true;
    notifyListeners();
    _user = await AuthService.restoreSession();
    if (_user != null) await SocketService.connect();
    _loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    _user = await AuthService.login(email, password);
    await SocketService.connect();
    notifyListeners();
  }

  Future<void> logout() async {
    SocketService.disconnect();
    await AuthService.logout();
    _user = null;
    notifyListeners();
  }
}
