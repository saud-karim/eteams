class Reaction {
  final String emoji;
  final int count;
  final List<String> userIds;
  Reaction({required this.emoji, required this.count, required this.userIds});
  factory Reaction.fromJson(Map<String, dynamic> j) => Reaction(
    emoji: j['emoji'],
    count: j['count'],
    userIds: List<String>.from(j['user_ids'] ?? []),
  );
}

class Message {
  final String id;
  final String channelId;
  final String userId;
  final String body;
  final String authorName;
  final String avatarInitials;
  final String avatarColor;
  final String authorRole;
  final DateTime createdAt;
  final DateTime? editedAt;
  final bool isPinned;
  final List<Reaction> reactions;

  Message({
    required this.id,
    required this.channelId,
    required this.userId,
    required this.body,
    required this.authorName,
    required this.avatarInitials,
    required this.avatarColor,
    required this.authorRole,
    required this.createdAt,
    this.editedAt,
    required this.isPinned,
    required this.reactions,
  });

  factory Message.fromJson(Map<String, dynamic> j) => Message(
    id: j['id'],
    channelId: j['channel_id'],
    userId: j['user_id'],
    body: j['body'],
    authorName: j['author_name'] ?? 'Unknown',
    avatarInitials: j['avatar_initials'] ?? '??',
    avatarColor: j['avatar_color'] ?? 'emerald',
    authorRole: j['author_role'] ?? 'user',
    createdAt: DateTime.parse(j['created_at']),
    editedAt: j['edited_at'] != null ? DateTime.parse(j['edited_at']) : null,
    isPinned: (j['is_pinned'] ?? 0) == 1,
    reactions: (j['reactions'] as List? ?? []).map((r) => Reaction.fromJson(r)).toList(),
  );
}
