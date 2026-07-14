import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/channel.dart';
import '../models/message.dart';
import '../providers/auth_provider.dart';
import '../providers/channels_provider.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../theme.dart';
import '../widgets/message_bubble.dart';
import '../widgets/composer_widget.dart';

class ChatScreen extends StatefulWidget {
  final Channel channel;
  const ChatScreen({super.key, required this.channel});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  List<Message> _messages = [];
  bool _loading = true;
  final _scrollCtrl = ScrollController();
  final Set<String> _typingUsers = {};

  @override
  void initState() {
    super.initState();
    _load();
    _bindSocket();
    ApiService.markRead(widget.channel.id).then((_) {
      if (mounted) context.read<ChannelsProvider>().load();
    });
  }

  Future<void> _load() async {
    try {
      final msgs = await ApiService.listMessages(widget.channel.id);
      if (mounted) {
        setState(() { _messages = msgs; _loading = false; });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  void _bindSocket() {
    SocketService.on('message:new', (data) {
      final msg = Message.fromJson(Map<String, dynamic>.from(data));
      if (msg.channelId != widget.channel.id) return;
      if (mounted) setState(() => _messages.add(msg));
      _scrollToBottom();
      ApiService.markRead(widget.channel.id);
    });
    SocketService.on('message:deleted', (data) {
      final id = data['id'];
      if (mounted) setState(() => _messages.removeWhere((m) => m.id == id));
    });
    SocketService.on('message:reactions', (data) {
      final id = data['id'];
      final reactions = (data['reactions'] as List).map((r) => Reaction.fromJson(Map<String, dynamic>.from(r))).toList();
      if (mounted) {
        setState(() {
          final idx = _messages.indexWhere((m) => m.id == id);
          if (idx >= 0) {
            final old = _messages[idx];
            _messages[idx] = Message(
              id: old.id, channelId: old.channelId, userId: old.userId, body: old.body,
              authorName: old.authorName, avatarInitials: old.avatarInitials, avatarColor: old.avatarColor,
              authorRole: old.authorRole, createdAt: old.createdAt, editedAt: old.editedAt,
              isPinned: old.isPinned, reactions: reactions,
            );
          }
        });
      }
    });
    SocketService.on('typing:start', (data) {
      if (data['channelId'] != widget.channel.id) return;
      if (mounted) setState(() => _typingUsers.add(data['name']));
    });
    SocketService.on('typing:stop', (data) {
      if (data['channelId'] != widget.channel.id) return;
      final userId = data['userId'];
      if (mounted) setState(() => _typingUsers.removeWhere((n) => n == userId));
    });
  }

  @override
  void dispose() {
    SocketService.off('message:new');
    SocketService.off('message:deleted');
    SocketService.off('message:reactions');
    SocketService.off('typing:start');
    SocketService.off('typing:stop');
    _scrollCtrl.dispose();
    super.dispose();
  }

  Future<void> _send(String body) async {
    await ApiService.sendMessage(widget.channel.id, body);
  }

  void _emitTyping(bool typing) {
    SocketService.emit(typing ? 'typing:start' : 'typing:stop', {'channelId': widget.channel.id});
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = context.watch<AuthProvider>().user?.id;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.panel,
        elevation: 0,
        title: Row(
          children: [
            Text(widget.channel.type == 'announcement' ? '📢 ' : '# ',
                style: const TextStyle(color: AppColors.textDim, fontSize: 18)),
            Text(widget.channel.name, style: const TextStyle(color: AppColors.text, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.emerald))
                : _messages.isEmpty
                    ? const Center(child: Text('No messages yet — say hi 👋', style: TextStyle(color: AppColors.textDim)))
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) {
                          final m = _messages[i];
                          return MessageBubble(
                            message: m,
                            isMine: m.userId == currentUserId,
                            onReact: () => ApiService.reactToMessage(m.id, '👍'),
                            onDelete: () async {
                              await ApiService.deleteMessage(m.id);
                              if (mounted) setState(() => _messages.removeWhere((x) => x.id == m.id));
                            },
                          );
                        },
                      ),
          ),
          if (_typingUsers.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              alignment: Alignment.centerLeft,
              child: Text('${_typingUsers.join(', ')} typing…',
                  style: const TextStyle(color: AppColors.textDim, fontSize: 11, fontStyle: FontStyle.italic)),
            ),
          if (!widget.channel.isReadonly)
            ComposerWidget(
              channelName: widget.channel.name,
              onSend: _send,
              onTyping: _emitTyping,
            ),
          if (widget.channel.isReadonly)
            Container(
              padding: const EdgeInsets.all(16),
              color: AppColors.panel,
              child: const Center(
                child: Text('🔒 This channel is read-only', style: TextStyle(color: AppColors.textDim, fontSize: 12)),
              ),
            ),
        ],
      ),
    );
  }
}
