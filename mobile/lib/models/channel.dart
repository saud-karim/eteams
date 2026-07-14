class Channel {
  final String id;
  final String slug;
  final String name;
  final String? description;
  final String type;
  final bool isReadonly;
  final int unreadCount;

  Channel({
    required this.id,
    required this.slug,
    required this.name,
    this.description,
    required this.type,
    required this.isReadonly,
    this.unreadCount = 0,
  });

  factory Channel.fromJson(Map<String, dynamic> j) => Channel(
    id: j['id'],
    slug: j['slug'],
    name: j['name'],
    description: j['description'],
    type: j['type'],
    isReadonly: (j['is_readonly'] ?? 0) == 1,
    unreadCount: j['unread_count'] ?? 0,
  );
}
