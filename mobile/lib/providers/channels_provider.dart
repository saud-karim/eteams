import 'package:flutter/foundation.dart';
import '../models/channel.dart';
import '../services/api_service.dart';

class ChannelsProvider extends ChangeNotifier {
  List<Channel> _channels = [];
  bool _loading = false;

  List<Channel> get channels => _channels;
  bool get loading => _loading;

  Future<void> load() async {
    _loading = true;
    notifyListeners();
    try {
      _channels = await ApiService.myChannels();
    } catch (_) {}
    _loading = false;
    notifyListeners();
  }

  Future<void> markRead(String channelId) async {
    await ApiService.markRead(channelId);
    await load();
  }
}
