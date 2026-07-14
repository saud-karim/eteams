# ETeams — v2 Roadmap

What's NOT in this package, in priority order.

## Priority 1 — Weeks 1-4 after launch

### File uploads (S3)
**Effort:** 3-4 days
Attachments schema is ready. Need:
- `POST /messages/upload` endpoint using multer
- Upload to S3-compatible bucket (DO Spaces / AWS S3)
- Composer file-picker in web + mobile
- Image inline preview, download link for docs

### Admin panel UI
**Effort:** 1-2 weeks
Data model is ready. UI to be built:
- User management (invite, deactivate, change role, reset password)
- Channel management (create/edit/archive)
- Permission assignment (assign channel managers, adjust per-user perms)
- Audit log viewer with filters

### Search indexing
**Effort:** 1 week
MySQL FULLTEXT is fine up to a few hundred thousand messages. Beyond that:
- Meilisearch or Typesense (self-hosted, ~2GB RAM)
- Index messages on create/update/delete via background worker
- Client hits `/api/search` — server queries index instead of MySQL

## Priority 2 — Weeks 5-8

### Push notifications
**Effort:** 4-5 days
- Firebase Cloud Messaging (FCM) integration
- Mobile: firebase_messaging package, request permission, register FCM token
- Backend: store `fcm_token` per user, send on mention/DM/announcement
- Web: browser Push API via service worker

### Voice/video calls
**Effort:** 1 week
- Integrate Jitsi Meet (self-hosted or Jitsi as a Service)
- Web: `<iframe>` embed with room name = channel/DM id
- Mobile: `jitsi_meet_flutter_sdk` package
- Server: no backend changes needed — Jitsi handles signaling

### Message export
**Effort:** 3-4 days
- `POST /channels/:id/export` — PDF or CSV
- PDF: puppeteer for rendering
- CSV: simple stream write
- Job queue (Bull + Redis) for large exports; email link when ready

## Priority 3 — Beyond week 8

### SSO integration
**Effort:** depends on provider
- SAML (Azure AD, Okta) — passport-saml
- OIDC (Google Workspace, Auth0) — openid-client
- Map SSO email → users table, auto-create on first login

### Bots / integrations
Simple bot framework:
- Webhook receiver (`POST /api/webhooks/:token`) → posts to a channel
- Bot commands (`/gif`, `/poll`)
- Integrations with Edara portal modules (procurement notifications → #procurement)

### Analytics dashboard
- Messages per day, active users, top channels
- Response time metrics (mention → reply)

### Compliance & retention automation
- Scheduled cron: purge messages older than channel's `retention_days`
- Legal hold: exempt specific users/channels from purge
- Export before delete

### Threading UI improvements
Data model supports threads. UI is basic. Improve:
- Reply-in-thread button visible on hover
- Thread panel on right side
- Thread counts in main view

### Slash commands
- `/remind me tomorrow` — create reminder
- `/poll` — create poll message
- `/away 1h` — set presence

### Custom emoji upload
- Superadmin uploads company emoji (`:edara:`, `:sodic:`)
- Stored in `custom_emoji` table + S3
- Composer autocompletes them
