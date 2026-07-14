# ETeams Mobile (Flutter)

## Setup

```bash
cd mobile
flutter pub get
cp .env.example .env
# Edit .env with your backend URL

# Run on connected device / emulator
flutter run

# Build APK
flutter build apk --release

# Build iOS (macOS only)
flutter build ios --release
```

## Structure

```
lib/
├── main.dart              # Entry point + routing
├── theme.dart             # Colors, typography
├── config/api.dart        # API base URLs
├── services/
│   ├── api_service.dart   # HTTP client
│   ├── auth_service.dart  # Login, token storage
│   └── socket_service.dart # Real-time WebSocket
├── models/
│   ├── user.dart
│   ├── channel.dart
│   └── message.dart
├── providers/
│   ├── auth_provider.dart
│   └── channels_provider.dart
├── screens/
│   ├── login_screen.dart
│   ├── workspace_screen.dart
│   └── chat_screen.dart
└── widgets/
    ├── message_bubble.dart
    └── composer_widget.dart
```

## What's included (MVP)

- Login (email + password)
- Channel list with unread counts
- Real-time chat (send/receive)
- Presence & typing indicators
- Reactions (add/remove)
- Message edit/delete (own only)

## What's next

- File attachments (image_picker + upload)
- Push notifications (Firebase FCM)
- Voice calls (integrate agora_rtc_engine or jitsi_meet_flutter_sdk)
- Video clips
- Offline draft persistence
