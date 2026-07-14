# ETeams — API Reference

Base URL: `http://localhost:4000/api`
All requests except `/auth/login`, `/auth/register`, `/health` require `Authorization: Bearer {accessToken}`.

## Auth

### `POST /auth/login`
```json
{ "email": "jasmine@edara.com.eg", "password": "Password123!" }
```
→ `200 { "user": {...}, "accessToken": "...", "refreshToken": "..." }`

### `POST /auth/register`
```json
{ "email": "...", "password": "min 8 chars", "name": "Full Name", "department": "...", "job_title": "..." }
```
→ `201 { "user": {...}, "accessToken": "...", "refreshToken": "..." }`

### `GET /auth/me`
→ `200 { "user": {...} }`

### `POST /auth/logout`
→ `200 { "ok": true }` — sets presence to offline, logs audit event.

## Users

### `GET /users`
List all active users.
→ `200 { "users": [{ id, email, name, avatar_initials, avatar_color, role, department, job_title, presence, ... }] }`

### `PUT /users/me/presence`
```json
{ "presence": "online|away|dnd|meeting|offline", "statusText": "In a meeting" }
```
→ `200 { "ok": true }`

## Channels

### `GET /channels`
List channels the current user belongs to, with unread counts.
→ `200 { "channels": [{ id, slug, name, description, type, is_readonly, unread_count, last_read_at, is_manager, ... }] }`

### `GET /channels/:slug`
Get channel details + members + your membership.
→ `200 { "channel": {...}, "members": [...], "membership": {...} }`

### `POST /channels` (Superadmin only)
```json
{ "name": "marketing", "description": "Marketing team", "type": "public|private|announcement" }
```
→ `201 { "channel": {...} }`

### `POST /channels/:id/members`
Add a user to a channel (Superadmin or member with `can_add_members`).
```json
{ "userId": "...", "isManager": false, "permissions": { "can_post": 1, ... } }
```
→ `200 { "ok": true }`

### `POST /channels/:id/read`
Mark channel as read up to now.
→ `200 { "ok": true }`

## Messages

### `GET /messages/channel/:channelId?limit=50&before=2026-07-01T00:00:00Z`
List messages in a channel (newest last).
→ `200 { "messages": [{ id, channel_id, user_id, body, author_name, avatar_initials, is_pinned, edited_at, created_at, reactions: [...] }] }`

### `POST /messages`
```json
{ "channelId": "...", "body": "Hello @jasmine!", "parentId": null }
```
→ `201 { "message": {...} }` (also emits `message:new` via socket)

### `PATCH /messages/:id`
Edit own message.
```json
{ "body": "updated text" }
```
→ `200 { "message": {...} }` (emits `message:updated`)

### `DELETE /messages/:id`
Soft-delete (own or Superadmin). Body preserved in DB; `deleted_at` set.
→ `200 { "ok": true }` (emits `message:deleted`)

### `POST /messages/:id/react`
```json
{ "emoji": "👍" }
```
Toggles the reaction (adds if absent, removes if present).
→ `200 { "reactions": [{ emoji, count, user_ids: [...] }] }` (emits `message:reactions`)

### `POST /messages/:id/pin`
Toggle pin (requires `can_pin_messages`).
→ `200 { "message": {...} }`

### `GET /messages/search?q=hvac`
Full-text search across channels the user belongs to.
→ `200 { "messages": [{ ..., channel_slug, channel_name }] }`

---

## WebSocket (Socket.io) events

**Connect:** `io('http://localhost:4000', { auth: { token: accessToken } })`

### Server → Client

| Event | Payload | When |
|---|---|---|
| `message:new` | `{ id, channel_id, user_id, body, author_name, ..., reactions: [] }` | New message in a channel you belong to |
| `message:updated` | Full message object | Message edited or pinned |
| `message:deleted` | `{ id }` | Message soft-deleted |
| `message:reactions` | `{ id, reactions: [...] }` | Reaction added/removed |
| `typing:start` | `{ userId, channelId, name }` | Someone started typing |
| `typing:stop` | `{ userId, channelId }` | Typing stopped or timed out |
| `presence:update` | `{ userId, presence }` | User went online/away/offline |

### Client → Server

| Event | Payload | Effect |
|---|---|---|
| `typing:start` | `{ channelId }` | Broadcasts typing to that channel |
| `typing:stop` | `{ channelId }` | Broadcasts typing stop |
| `presence:set` | `{ presence, statusText }` | Update your presence |
| `channel:join` | `{ channelId }` | Subscribe to a channel room (after being added) |

## Errors

All errors return JSON:
```json
{ "error": "human-readable message", "details": {...} }
```
Common codes: `400` validation, `401` bad/missing token, `403` forbidden, `404` not found, `409` conflict, `500` server error.
