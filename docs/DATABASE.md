# ETeams — Database Schema

MySQL 8, InnoDB, `utf8mb4_unicode_ci`. Full DDL in `backend/src/db/migrations/`.

## Tables

### `users`
The people using ETeams. Includes their presence state.

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID v4 |
| `email` | VARCHAR(191) UNIQUE | Work email |
| `password_hash` | VARCHAR(255) | bcrypt hash |
| `name` | VARCHAR(100) | Full name |
| `avatar_initials` | VARCHAR(4) | e.g. "JA" |
| `avatar_color` | VARCHAR(30) | palette key: blue/emerald/amber/coral/purple |
| `role` | ENUM | `superadmin` \| `user` |
| `department`, `job_title` | VARCHAR | Org info |
| `presence` | ENUM | `online` \| `away` \| `dnd` \| `meeting` \| `offline` |
| `status_text` | VARCHAR(120) | Custom status message |
| `last_seen_at` | DATETIME | Last activity ping |
| `is_active` | TINYINT | Soft deactivation |

Indexes: `email`, `presence`, `is_active`.

### `channels`
Chat rooms — public, private, announcement, DM, group DM.

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | UUID |
| `slug` | VARCHAR(100) UNIQUE | URL-safe name |
| `name` | VARCHAR(100) | Display name |
| `type` | ENUM | `public` \| `private` \| `announcement` \| `dm` \| `group_dm` |
| `is_mandatory` | TINYINT | Auto-add all users |
| `is_readonly` | TINYINT | Only managers can post |
| `retention_days` | INT NULL | Auto-delete messages after N days (v2) |
| `created_by` | CHAR(36) FK → users | |
| `archived_at` | DATETIME | Soft archive |

### `memberships`
Which users belong to which channels + per-channel permissions.

| Column | Type | Notes |
|---|---|---|
| `channel_id`, `user_id` | CHAR(36) | Composite unique |
| `is_manager` | TINYINT | Appointed by Superadmin |
| `can_post` | TINYINT | Default 1 (0 for readonly channels for non-managers) |
| `can_add_members`, `can_remove_members`, `can_pin_messages`, `can_edit_topic`, `can_delete_messages` | TINYINT | Granular manager permissions |
| `last_read_at` | DATETIME | For unread counts |
| `notification_pref` | ENUM | `all` \| `mentions` \| `none` |

Unique key `(channel_id, user_id)`. Indexed on both.

### `messages`
Individual chat messages. Threads via `parent_id`.

| Column | Type | Notes |
|---|---|---|
| `id`, `channel_id`, `user_id` | CHAR(36) | |
| `parent_id` | CHAR(36) NULL | For threads; null = top-level message |
| `body` | TEXT | Message content (up to 10k chars) |
| `is_pinned` | TINYINT | Pinned messages appear in a strip |
| `edited_at` | DATETIME | Set on edit |
| `deleted_at` | DATETIME | Soft delete (body preserved for audit) |
| `mentions` | JSON | `{ users: [ids], special: ["channel"|"here"|"everyone"] }` |

Indexes:
- `(channel_id, created_at DESC)` — main list query
- `parent_id` — thread lookups
- FULLTEXT on `body` — search

### `reactions`
Emoji reactions.

| Column | Type | Notes |
|---|---|---|
| `message_id`, `user_id`, `emoji` | | Unique triple |

Toggling: DELETE if exists, INSERT if not.

### `attachments`
File attachments to messages (v2 fully wired; schema ready now).

| Column | Type | Notes |
|---|---|---|
| `message_id` | CHAR(36) FK | |
| `filename`, `original_name` | VARCHAR | Storage vs display name |
| `mime_type` | VARCHAR(100) | |
| `size_bytes` | BIGINT | |
| `storage_key` | VARCHAR(500) | Local path or S3 key |

### `audit_log`
Immutable record of sensitive actions.

| Column | Type |
|---|---|
| `actor_id` | User who did it |
| `action` | e.g. `user.login`, `channel.create`, `message.delete` |
| `entity_type`, `entity_id` | Target (channel, user, message, ...) |
| `metadata` | JSON with contextual info |
| `ip_address` | Origin IP |

Actions currently logged: user login/logout/register, channel create + add_member, message delete.

### `refresh_tokens`
For long-lived session refresh (v2 refresh flow).

## Retention & compliance

- **Soft delete on messages** — `deleted_at` timestamp, body preserved. UI hides them; audits can recover.
- **Retention policy on channels** — `retention_days` field; scheduled job (v2) purges messages older than that.
- **Audit log is append-only** — never delete rows.
- **User deactivation** (`is_active = 0`) preserves history rather than cascading deletes.

## Backup

MySQL binlogs enabled + nightly `mysqldump` to S3 recommended.
Point-in-time recovery to any minute in the last 7 days.

## Indexing rationale

- `messages(channel_id, created_at DESC)` — hot path for message list
- FULLTEXT on `messages.body` — for `/messages/search`; consider dedicated search (Meilisearch) at scale
- `memberships(channel_id, user_id)` unique — prevents double-membership, fast permission checks
- `audit_log(actor_id, created_at DESC)` — user activity queries
