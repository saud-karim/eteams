class User {
  final String id;
  final String email;
  final String name;
  final String avatarInitials;
  final String avatarColor;
  final String role;
  final String? department;
  final String? jobTitle;
  final String presence;

  User({
    required this.id,
    required this.email,
    required this.name,
    required this.avatarInitials,
    required this.avatarColor,
    required this.role,
    this.department,
    this.jobTitle,
    required this.presence,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
    id: j['id'],
    email: j['email'],
    name: j['name'],
    avatarInitials: j['avatar_initials'],
    avatarColor: j['avatar_color'] ?? 'emerald',
    role: j['role'],
    department: j['department'],
    jobTitle: j['job_title'],
    presence: j['presence'] ?? 'offline',
  );
}
