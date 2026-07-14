import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api.dart';

typedef SocketHandler = void Function(dynamic);

class SocketService {
  static IO.Socket? _socket;

  static Future<void> connect() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('accessToken');
    if (token == null) return;

    _socket = IO.io(
      ApiConfig.socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );
    _socket!.connect();
    _socket!.onConnect((_) => print('[socket] connected'));
    _socket!.onConnectError((err) => print('[socket] error: $err'));
    _socket!.onDisconnect((_) => print('[socket] disconnected'));
  }

  static void on(String event, SocketHandler handler) => _socket?.on(event, handler);
  static void off(String event, [SocketHandler? handler]) => _socket?.off(event, handler);
  static void emit(String event, dynamic data) => _socket?.emit(event, data);
  static void disconnect() { _socket?.disconnect(); _socket = null; }
}
