# ETeams — Internal Communication Platform

Production-ready starter for Edara IFM's internal chat platform.
Replaces email as the official day-to-day communication channel.

## Stack

- **Backend** — Node.js 20 + Express + Socket.io
- **Web** — React 18 + Vite (SPA)
- **Mobile** — Flutter 3.x (iOS + Android)
- **Database** — MySQL 8
- **Real-time** — Socket.io (WebSocket + fallback)
- **Auth** — JWT (access + refresh tokens)
- **File storage** — Local disk (dev) / S3-compatible (prod)

## What's included in this package

**Core chat** — channels, DMs, group DMs, real-time messaging, presence, typing indicators, reactions, mentions (@user / @channel / @here / @everyone), edit/delete messages (soft delete), threads, pinned messages.

**Auth** — email/password login, JWT tokens, session management, role-based access (superadmin / user).

**Web UI** — login, workspace shell (sidebar + chat + right panel), real-time updates, mobile-responsive.

**Mobile** — Flutter app with login, channel list, chat screen, real-time updates.

## What's NOT included (v2 roadmap — clearly scoped, easy to add)

- File uploads to S3 (local upload works; S3 needs config)
- Voice/video calls (integrate Jitsi Meet — 2-3 days)
- Full admin panel (users/channels/permissions management)
- Search indexing (Meilisearch/Typesense — 1 week)
- Push notifications (Firebase FCM — 3-4 days)
- Message export (PDF/CSV — 2-3 days)
- SSO integration (SAML/OIDC — depends on provider)
- Audit log UI (data model is there; UI to be built)

See `docs/ROADMAP.md` for the full v2 plan.

## Quick start (local dev)

**Prerequisites:** Node.js 20+, MySQL 8+, Flutter 3.x (for mobile), Docker (optional but recommended).

### Option 1 — Docker (easiest)

```bash
cd eteams
cp .env.example .env
docker compose up -d
# Backend runs on http://localhost:4000
# Web runs on http://localhost:5173
# MySQL runs on localhost:3306
```

### Option 2 — Local without Docker

```bash
# 1. Start MySQL, create database
mysql -u root -p
CREATE DATABASE eteams;
exit

# 2. Backend
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials
npm install
npm run migrate
npm run seed
npm run dev
# Backend: http://localhost:4000

# 3. Web (in another terminal)
cd web
cp .env.example .env
npm install
npm run dev
# Web: http://localhost:5173
```

### Default seeded users

| Email | Password | Role |
|---|---|---|
| jasmine@edara.com.eg | Password123! | Superadmin |
| beltagy@edara.com.eg | Password123! | User (CEO) |
| karim@edara.com.eg | Password123! | User |
| mariam@edara.com.eg | Password123! | User (HR) |

## Project structure

```
eteams/
├── backend/          # Node.js + Express + Socket.io API
│   ├── src/
│   │   ├── server.js       # Entry point
│   │   ├── app.js          # Express app
│   │   ├── config/         # DB, env, socket config
│   │   ├── db/             # Migrations, seeders, connection
│   │   ├── models/         # DB access layer
│   │   ├── controllers/    # HTTP request handlers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, validation, errors
│   │   ├── sockets/        # WebSocket handlers
│   │   └── utils/          # Helpers
│   └── package.json
├── web/              # React SPA
│   ├── src/
│   │   ├── main.jsx        # Entry point
│   │   ├── App.jsx         # Router
│   │   ├── api/            # API client
│   │   ├── context/        # Auth + Socket contexts
│   │   ├── pages/          # Login, Workspace
│   │   ├── components/     # UI components
│   │   └── styles/         # CSS
│   └── package.json
├── mobile/           # Flutter app
│   ├── lib/
│   │   ├── main.dart       # Entry point
│   │   ├── config/         # API URLs
│   │   ├── services/       # API + Socket + Auth
│   │   ├── models/         # Data classes
│   │   ├── providers/      # State management
│   │   ├── screens/        # UI screens
│   │   └── widgets/        # Reusable widgets
│   └── pubspec.yaml
├── docs/
│   ├── ARCHITECTURE.md    # System design
│   ├── API.md             # HTTP + Socket API reference
│   ├── DATABASE.md        # Schema documentation
│   ├── DEPLOYMENT.md      # Production deployment guide
│   └── ROADMAP.md         # v2 features
├── docker-compose.yml
└── README.md
```

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how it all fits together
- **[docs/API.md](docs/API.md)** — HTTP endpoints + WebSocket events
- **[docs/DATABASE.md](docs/DATABASE.md)** — schema, indexes, retention
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — production deployment (VPS, Nginx, PM2, SSL)
- **[docs/ROADMAP.md](docs/ROADMAP.md)** — v2 features scoped

## Deployment (short version)

Single VPS (Hetzner CX21 / DigitalOcean $12) can handle 500 users comfortably.

```
[User Browser] → Nginx (SSL) → Node.js (PM2) → MySQL
                            → Web static files
                            → WebSocket (Socket.io)
```

See `docs/DEPLOYMENT.md` for full guide.

## License

Internal Edara IFM project. All rights reserved.
