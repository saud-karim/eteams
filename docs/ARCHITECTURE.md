# ETeams — Architecture

## System overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Web (React) │    │ Mobile (Flutter) │    │  Admin UI    │
│  Vite SPA    │    │  iOS + Android   │    │  (v2)        │
└──────┬───────┘    └────────┬─────────┘    └──────┬───────┘
       │                     │                     │
       │   HTTPS + WSS       │                     │
       └─────────────────────┼─────────────────────┘
                             │
                    ┌────────▼────────┐
                    │    Nginx        │
                    │  (SSL, proxy)   │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼──────┐  ┌────▼─────┐  ┌────▼──────┐
       │  Node.js    │  │ Socket.io │  │  Static   │
       │  (Express)  │  │  (WSS)    │  │  Files    │
       │  REST API   │  │           │  │           │
       └──────┬──────┘  └────┬──────┘  └───────────┘
              │              │
              └──────┬───────┘
                     │
              ┌──────▼──────┐
              │   MySQL 8   │
              │  (primary)  │
              └─────────────┘
```

## Layers

**Presentation** — React SPA (web) + Flutter (mobile). Both talk to the same Node.js API.

**API** — Express handles HTTP (auth, channels, messages CRUD). Socket.io handles real-time (new messages, typing, presence).

**Domain models** — Users, Channels, Memberships (with per-channel permissions), Messages, Reactions, Attachments, Audit Log.

**Data** — MySQL 8 with InnoDB. Full-text index on `messages.body` for search. Soft delete on messages (audit-preserving).

## Auth flow

1. User submits email/password → backend validates against `users.password_hash` (bcrypt)
2. Backend returns `accessToken` (JWT, 15min) + `refreshToken` (JWT, 30d)
3. Client stores tokens in localStorage (web) / SharedPreferences (mobile)
4. Every HTTP request → `Authorization: Bearer {accessToken}`
5. Socket.io connection → `auth: { token }` on handshake
6. Middleware `requireAuth` verifies token → attaches `req.user`

## Real-time flow

1. Client connects to Socket.io with JWT
2. Backend joins socket to `channel:{id}` rooms (one per channel the user is a member of)
3. Backend broadcasts presence update to everyone
4. When user sends message via HTTP `POST /api/messages` → server emits `message:new` to `channel:{id}` room
5. All clients in that room receive the message and update UI

Events:
- `message:new` / `message:updated` / `message:deleted` / `message:reactions`
- `typing:start` / `typing:stop`
- `presence:update`
- `channel:join`

## Permission model

**Two tiers:**

1. **User role** (in `users.role`): `superadmin` | `user`
   - Superadmin has global override on everything (create channels, add users, delete any message).
2. **Channel membership** (in `memberships`): per-user, per-channel permission flags
   - `is_manager` — appointed by Superadmin
   - `can_post`, `can_add_members`, `can_remove_members`, `can_pin_messages`, `can_edit_topic`, `can_delete_messages`
   - Templates: Full Manager (all 6 = 1), Poster Only (post = 1), Moderator (post + pin + delete = 1), Custom.

**Rule:** normal users cannot create channels. Only Superadmin. Managers get their manager rights explicitly by Superadmin.

## Data flow — sending a message

```
Client                 API                    DB                Socket
  │                     │                      │                   │
  ├─ POST /messages ───►│                      │                   │
  │                     ├─ check membership ──►│                   │
  │                     │◄──── ok ─────────────│                   │
  │                     ├─ INSERT message ────►│                   │
  │                     │◄──── {id, ...} ──────│                   │
  │                     ├─ parse mentions      │                   │
  │                     ├─ emitToChannel ─────────────────────────►│
  │                     │                      │                   ├─ broadcast to
  │                     │                      │                   │  channel:{id} room
  │◄── 201 {message} ───┤                      │                   │
  │                                                                │
  │◄──────────── 'message:new' ────────────────────────────────────┤
```

## Deployment topology

**Single-VPS (up to ~1000 users):**
- 1 x Hetzner CX21 (2 vCPU, 4GB RAM, 40GB SSD) — ~€6/mo
- Nginx as reverse proxy + SSL termination (Let's Encrypt)
- Node.js under PM2 (cluster mode = 1-2 workers)
- MySQL 8 on the same box
- Static web files served by Nginx
- Uploads on local disk (`/var/eteams/uploads`) — mounted volume

**Scaling path (1000+ users, when needed):**
- Move MySQL to managed DB (DigitalOcean Managed / RDS)
- Move file storage to S3-compatible (DO Spaces / Wasabi)
- Add Redis for Socket.io adapter (for multi-node)
- Add 2+ Node.js instances behind LB
- CDN for static assets

## Tech decisions

- **Node.js** — chosen for excellent WebSocket concurrency, mature Socket.io ecosystem.
- **MySQL over Postgres** — team familiarity, existing Edara portal uses MySQL. Postgres would work equally well.
- **React SPA over SSR** — chat is an app, not a document; SSR gives no benefit.
- **Flutter over React Native** — single codebase for iOS + Android, better performance for chat.
- **Socket.io over raw WebSockets** — battle-tested, automatic reconnection, fallback to long-polling.
- **JWT over sessions** — stateless, works trivially across web + mobile.
- **Soft delete** — messages are never truly deleted from DB (`deleted_at` set instead) — audit + compliance.

## Security

- All passwords bcrypt-hashed (cost 10)
- JWT secret in `.env` (never committed)
- CORS locked to configured origin
- Helmet middleware (CSP, HSTS, XSS-protection headers)
- Zod validation on all inputs
- SQL parameterized via mysql2 named placeholders — no injection surface
- Audit log for sensitive actions (login, delete, permission changes)
