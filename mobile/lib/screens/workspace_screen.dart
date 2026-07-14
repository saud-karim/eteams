import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/channels_provider.dart';
import '../models/channel.dart';
import '../theme.dart';
import 'chat_screen.dart';

class WorkspaceScreen extends StatefulWidget {
  const WorkspaceScreen({super.key});
  @override
  State<WorkspaceScreen> createState() => _WorkspaceScreenState();
}

class _WorkspaceScreenState extends State<WorkspaceScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<ChannelsProvider>().load());
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final chp = context.watch<ChannelsProvider>();

    final announce = chp.channels.where((c) => c.type == 'announcement').toList();
    final publicC = chp.channels.where((c) => c.type == 'public').toList();
    final privateC = chp.channels.where((c) => c.type == 'private').toList();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.panel,
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 30, height: 30,
              decoration: BoxDecoration(gradient: AppColors.gradient, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.chat_bubble_outline, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 10),
            RichText(
              text: const TextSpan(
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                children: [
                  TextSpan(text: 'E', style: TextStyle(color: AppColors.emerald)),
                  TextSpan(text: 'Teams', style: TextStyle(color: AppColors.text)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            icon: Container(
              width: 32, height: 32,
              decoration: BoxDecoration(gradient: AppColors.gradient, borderRadius: BorderRadius.circular(8)),
              alignment: Alignment.center,
              child: Text(auth.user?.avatarInitials ?? '?', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
            ),
            color: AppColors.panel,
            onSelected: (v) async {
              if (v == 'logout') await auth.logout();
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(auth.user?.name ?? '', style: const TextStyle(color: AppColors.text, fontWeight: FontWeight.bold)),
                    Text(auth.user?.jobTitle ?? '', style: const TextStyle(color: AppColors.textDim, fontSize: 11)),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(value: 'logout', child: Text('Sign out', style: TextStyle(color: AppColors.text))),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: chp.loading && chp.channels.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.emerald))
          : RefreshIndicator(
              color: AppColors.emerald,
              onRefresh: () => chp.load(),
              child: ListView(
                children: [
                  if (announce.isNotEmpty) ...[
                    _sectionHeader('ANNOUNCEMENTS'),
                    ...announce.map(_channelTile),
                  ],
                  _sectionHeader('CHANNELS'),
                  ...publicC.map(_channelTile),
                  ...privateC.map(_channelTile),
                ],
              ),
            ),
    );
  }

  Widget _sectionHeader(String text) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
    child: Text(text, style: const TextStyle(color: AppColors.textMute, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
  );

  Widget _channelTile(Channel c) => ListTile(
    leading: Text(
      c.type == 'announcement' ? '📢' : '#',
      style: TextStyle(fontSize: 18, color: AppColors.textDim, fontWeight: c.type == 'announcement' ? FontWeight.normal : FontWeight.bold),
    ),
    title: Text(
      c.name,
      style: TextStyle(
        color: AppColors.text,
        fontWeight: c.unreadCount > 0 ? FontWeight.bold : FontWeight.normal,
      ),
    ),
    subtitle: c.description != null ? Text(c.description!, style: const TextStyle(color: AppColors.textMute, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis) : null,
    trailing: c.unreadCount > 0
        ? Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: AppColors.emerald, borderRadius: BorderRadius.circular(10)),
            child: Text('${c.unreadCount}', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
          )
        : null,
    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(channel: c))),
  );
}
