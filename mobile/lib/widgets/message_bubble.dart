import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/message.dart';
import '../theme.dart';

class MessageBubble extends StatelessWidget {
  final Message message;
  final bool isMine;
  final VoidCallback? onReact;
  final VoidCallback? onDelete;

  const MessageBubble({
    super.key,
    required this.message,
    required this.isMine,
    this.onReact,
    this.onDelete,
  });

  Color _avatarColor() {
    switch (message.avatarColor) {
      case 'amber': return AppColors.gold;
      case 'blue': return const Color(0xFF3B82F6);
      case 'coral': return const Color(0xFFEC4899);
      case 'purple': return const Color(0xFFA78BFA);
      default: return AppColors.emerald;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPress: () => _showActions(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: message.isPinned
            ? BoxDecoration(
                color: AppColors.gold.withOpacity(0.06),
                border: Border(left: BorderSide(color: AppColors.gold, width: 3)),
              )
            : null,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: _avatarColor(),
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: Text(
                message.avatarInitials,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(message.authorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.text)),
                      const SizedBox(width: 8),
                      Text(
                        DateFormat.jm().format(message.createdAt),
                        style: const TextStyle(fontSize: 11, color: AppColors.textMute),
                      ),
                      if (message.editedAt != null) ...[
                        const SizedBox(width: 6),
                        const Text('(edited)', style: TextStyle(fontSize: 10, color: AppColors.textMute, fontStyle: FontStyle.italic)),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(message.body, style: const TextStyle(color: AppColors.text, fontSize: 14, height: 1.4)),
                  if (message.reactions.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 4, runSpacing: 4,
                      children: message.reactions.map((r) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.panel,
                          border: Border.all(color: AppColors.border),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text('${r.emoji} ${r.count}', style: const TextStyle(fontSize: 12, color: AppColors.text)),
                      )).toList(),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showActions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.panel,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Text('👍', style: TextStyle(fontSize: 20)),
              title: const Text('React with 👍', style: TextStyle(color: AppColors.text)),
              onTap: () { Navigator.pop(context); onReact?.call(); },
            ),
            if (isMine)
              ListTile(
                leading: const Icon(Icons.delete_outline, color: AppColors.danger),
                title: const Text('Delete', style: TextStyle(color: AppColors.danger)),
                onTap: () { Navigator.pop(context); onDelete?.call(); },
              ),
          ],
        ),
      ),
    );
  }
}
