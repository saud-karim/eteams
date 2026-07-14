import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api.dart';
import '../models/user.dart';
import '../models/channel.dart';
import '../models/message.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

class ApiService {
  static Future<String?> _token() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('accessToken');
  }

  static Future<Map<String, String>> _headers() async {
    final token = await _token();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<dynamic> _request(String method, String path, {Map<String, dynamic>? body}) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/api$path');
    final headers = await _headers();
    late http.Response res;
    switch (method) {
      case 'GET':    res = await http.get(uri, headers: headers); break;
      case 'POST':   res = await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null); break;
      case 'PATCH':  res = await http.patch(uri, headers: headers, body: body != null ? jsonEncode(body) : null); break;
      case 'DELETE': res = await http.delete(uri, headers: headers); break;
      case 'PUT':    res = await http.put(uri, headers: headers, body: body != null ? jsonEncode(body) : null); break;
      default: throw ApiException('Unsupported method');
    }
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return jsonDecode(res.body);
    }
    final err = jsonDecode(res.body);
    throw ApiException(err['error'] ?? 'HTTP ${res.statusCode}');
  }

  // Auth
  static Future<Map<String, dynamic>> login(String email, String password) async {
    return await _request('POST', '/auth/login', body: {'email': email, 'password': password});
  }

  static Future<User> me() async {
    final r = await _request('GET', '/auth/me');
    return User.fromJson(r['user']);
  }

  static Future<void> logout() async {
    await _request('POST', '/auth/logout');
  }

  // Users
  static Future<List<User>> listUsers() async {
    final r = await _request('GET', '/users');
    return (r['users'] as List).map((u) => User.fromJson(u)).toList();
  }

  static Future<void> setPresence(String presence) async {
    await _request('PUT', '/users/me/presence', body: {'presence': presence});
  }

  // Channels
  static Future<List<Channel>> myChannels() async {
    final r = await _request('GET', '/channels');
    return (r['channels'] as List).map((c) => Channel.fromJson(c)).toList();
  }

  static Future<void> markRead(String channelId) async {
    await _request('POST', '/channels/$channelId/read');
  }

  // Messages
  static Future<List<Message>> listMessages(String channelId) async {
    final r = await _request('GET', '/messages/channel/$channelId');
    return (r['messages'] as List).map((m) => Message.fromJson(m)).toList();
  }

  static Future<Message> sendMessage(String channelId, String body) async {
    final r = await _request('POST', '/messages', body: {'channelId': channelId, 'body': body});
    return Message.fromJson(r['message']);
  }

  static Future<void> deleteMessage(String id) async {
    await _request('DELETE', '/messages/$id');
  }

  static Future<void> reactToMessage(String id, String emoji) async {
    await _request('POST', '/messages/$id/react', body: {'emoji': emoji});
  }
}
