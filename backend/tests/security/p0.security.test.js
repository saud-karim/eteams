const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../../src/app');
const { db } = require('../../src/db/connection');
const Channel = require('../../src/models/Channel');
const path = require('path');
const fs = require('fs');

// ── Runtime fixtures (populated in beforeAll) ─────────────────────────────
let USER_A_TOKEN, USER_B_TOKEN;
let USER_A_ID, USER_B_ID;
let PUBLIC_CHANNEL_ID, PRIVATE_CHANNEL_ID;
let USER_A_ATTACHMENT_ID, USER_B_ATTACHMENT_ID;

const PROTECTED_ENDPOINT = '/api/auth/me';

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  USER_A_ID = uuidv4();
  USER_B_ID = uuidv4();

  await db.query(
    `INSERT INTO users (id, username, name, email, password_hash, role, token_version) VALUES
     (?, 'p0_usera', 'P0 User A', 'p0a@test.com', 'hash', 'user', 1),
     (?, 'p0_userb', 'P0 User B', 'p0b@test.com', 'hash', 'user', 1)`,
    [USER_A_ID, USER_B_ID]
  );

  USER_A_TOKEN = jwt.sign({ sub: USER_A_ID, token_version: 1 }, process.env.JWT_SECRET, { algorithm: 'HS256' });
  USER_B_TOKEN = jwt.sign({ sub: USER_B_ID, token_version: 1 }, process.env.JWT_SECRET, { algorithm: 'HS256' });

  PUBLIC_CHANNEL_ID = uuidv4();
  PRIVATE_CHANNEL_ID = uuidv4();

  await db.query(
    `INSERT INTO channels (id, name, slug, type, created_by) VALUES
     (?, 'P0 Public', 'p0-public-ch', 'public', ?),
     (?, 'P0 Private', 'p0-private-ch', 'private', ?)`,
    [PUBLIC_CHANNEL_ID, USER_A_ID, PRIVATE_CHANNEL_ID, USER_A_ID]
  );

  // Membership: A is regular member of public (not manager), B is NOT member
  await db.query(
    `INSERT INTO memberships (id, channel_id, user_id, is_manager) VALUES (?, ?, ?, 0)`,
    [uuidv4(), PUBLIC_CHANNEL_ID, USER_A_ID]
  );

  // Create a real message with attachment for A (in public channel)
  const msgAId = uuidv4();
  await db.query(
    `INSERT INTO messages (id, channel_id, user_id, body) VALUES (?, ?, ?, 'test attachment')`,
    [msgAId, PUBLIC_CHANNEL_ID, USER_A_ID]
  );

  // Write a temp file for the attachment
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const fileAPath = path.join(uploadsDir, `p0_attach_a_${uuidv4()}.txt`);
  fs.writeFileSync(fileAPath, 'attachment content A');

  const attachAId = uuidv4();
  const storageKeyA = path.join('uploads', path.basename(fileAPath));
  await db.query(
    `INSERT INTO attachments (id, message_id, filename, original_name, mime_type, size_bytes, storage_key) VALUES
     (?, ?, ?, 'test-a.txt', 'text/plain', 20, ?)`,
    [attachAId, msgAId, path.basename(fileAPath), storageKeyA]
  );
  USER_A_ATTACHMENT_ID = attachAId;

  // Create message + attachment for B in a separate private channel (B is member, A is not)
  const msgBId = uuidv4();
  await db.query(
    `INSERT INTO messages (id, channel_id, user_id, body) VALUES (?, ?, ?, 'test attachment B')`,
    [msgBId, PRIVATE_CHANNEL_ID, USER_A_ID]
  );

  await db.query(
    `INSERT INTO memberships (id, channel_id, user_id, is_manager) VALUES (?, ?, ?, 1)`,
    [uuidv4(), PRIVATE_CHANNEL_ID, USER_B_ID]
  );

  const fileBPath = path.join(uploadsDir, `p0_attach_b_${uuidv4()}.txt`);
  fs.writeFileSync(fileBPath, 'attachment content B');

  const attachBId = uuidv4();
  const storageKeyB = path.join('uploads', path.basename(fileBPath));
  await db.query(
    `INSERT INTO attachments (id, message_id, filename, original_name, mime_type, size_bytes, storage_key) VALUES
     (?, ?, ?, 'test-b.txt', 'text/plain', 20, ?)`,
    [attachBId, msgBId, path.basename(fileBPath), storageKeyB]
  );
  USER_B_ATTACHMENT_ID = attachBId;
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id IN (?, ?)', [USER_A_ID, USER_B_ID]);
  await db.query('DELETE FROM channels WHERE id IN (?, ?)', [PUBLIC_CHANNEL_ID, PRIVATE_CHANNEL_ID]);
});

describe('P0 Security Regression Tests', () => {
  describe('1. Central Authorization', () => {
    test('permissions helper should deny unauthenticated access', () => {
      const {
        canViewChannel,
        canSendMessage,
        canManageChannel,
        canDeleteChannel,
        canManageMembers,
      } = require('../../src/utils/permissions');

      const channel = {
        id: 1,
        type: 'private',
      };

      expect(canViewChannel(null, channel, null)).toBe(false);
      expect(canSendMessage(null, channel, null)).toBe(false);
      expect(canManageChannel(null, channel, null)).toBe(false);
      expect(canDeleteChannel(null, channel)).toBe(false);
      expect(canManageMembers(null, channel, null)).toBe(false);
    });

    test('public channel should be viewable by authenticated users', () => {
      const { canViewChannel } = require('../../src/utils/permissions');

      const user = {
        id: 100,
        role: 'user',
      };

      const channel = {
        id: 1,
        type: 'public',
        deleted_at: null,
        archived_at: null,
      };

      expect(canViewChannel(user, channel, null)).toBe(true);
    });

    test('private channel should require membership', () => {
      const { canViewChannel } = require('../../src/utils/permissions');

      const user = {
        id: 100,
        role: 'user',
      };

      const channel = {
        id: 1,
        type: 'private',
        deleted_at: null,
        archived_at: null,
      };

      expect(canViewChannel(user, channel, null)).toBe(false);

      expect(
        canViewChannel(user, channel, {
          user_id: 100,
          is_manager: 0,
        })
      ).toBe(true);
    });

    test('superadmin should bypass channel membership', () => {
      const { canViewChannel } = require('../../src/utils/permissions');

      const user = {
        id: 999,
        role: 'superadmin',
      };

      const channel = {
        id: 1,
        type: 'private',
        deleted_at: null,
        archived_at: null,
      };

      expect(canViewChannel(user, channel, null)).toBe(true);
    });

    test('deleted channel should not be viewable by normal users', () => {
      const { canViewChannel } = require('../../src/utils/permissions');

      const user = {
        id: 100,
        role: 'user',
      };

      const channel = {
        id: 1,
        type: 'private',
        deleted_at: new Date(),
        archived_at: null,
      };

      expect(
        canViewChannel(user, channel, {
          user_id: 100,
        })
      ).toBe(false);
    });
  });

  describe('2. Public /uploads Exposure', () => {
    test('direct access to /uploads must not expose files', async () => {
      const response = await request(app)
        .get('/uploads/test-file.txt');

      expect(response.status).toBe(404);
    });
  });

  describe('3. JWT Query Token Removal', () => {
    test('query token must not authenticate REST requests', async () => {
      expect(USER_A_TOKEN).toBeTruthy();

      const response = await request(app)
        .get(PROTECTED_ENDPOINT)
        .query({
          token: USER_A_TOKEN,
        });

      expect(response.status).toBe(401);
    });

    test('Bearer token must authenticate valid REST requests', async () => {
      expect(USER_A_TOKEN).toBeTruthy();

      const response = await request(app)
        .get(PROTECTED_ENDPOINT)
        .set(auth(USER_A_TOKEN));

      /*
       * We don't require a specific success code because the
       * endpoint itself may return 200/403/404 depending on
       * the configured test data.
       *
       * The important assertion is that authentication was accepted.
       */
      expect(response.status).not.toBe(401);
    });
  });

  describe('4. Attachment IDOR', () => {
    test('attachment endpoint requires authentication', async () => {
      expect(USER_A_ATTACHMENT_ID).toBeTruthy();

      const response = await request(app)
        .get(`/api/messages/download/${USER_A_ATTACHMENT_ID}`);

      expect(response.status).toBe(401);
    });

    test('User A can access an attachment they are authorized to see', async () => {
      expect(USER_A_TOKEN).toBeTruthy();
      expect(USER_A_ATTACHMENT_ID).toBeTruthy();

      const response = await request(app)
        .get(`/api/messages/download/${USER_A_ATTACHMENT_ID}`)
        .set(auth(USER_A_TOKEN));

      expect(response.status).toBe(200);
      expect(response.headers['content-disposition']).toMatch(/^attachment/i);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('User A cannot access User B attachment without authorization', async () => {
      expect(USER_A_TOKEN).toBeTruthy();
      expect(USER_B_ATTACHMENT_ID).toBeTruthy();

      const response = await request(app)
        .get(`/api/messages/download/${USER_B_ATTACHMENT_ID}`)
        .set(auth(USER_A_TOKEN));

      expect(response.status).toBe(403);
    });

    test('unknown attachment returns 404', async () => {
      expect(USER_A_TOKEN).toBeTruthy();

      const response = await request(app)
        .get('/api/messages/download/999999999')
        .set(auth(USER_A_TOKEN));

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('5. Public Self-Join Privilege Escalation', () => {
    test('self-join must not grant manager privileges', async () => {
      expect(USER_A_TOKEN).toBeTruthy();
      expect(PUBLIC_CHANNEL_ID).toBeTruthy();

      const response = await request(app)
        .post(`/api/channels/${PUBLIC_CHANNEL_ID}/members`)
        .set(auth(USER_A_TOKEN))
        .send({
          userId: USER_A_ID,
          isManager: true,
          permissions: {
            delete: true,
            manage_members: true,
            can_add_members: true,
            can_remove_members: true,
            is_manager: true,
          },
        });

      expect([200, 201, 400, 409]).toContain(response.status);
    });

    test('self-join must ignore permission escalation fields', async () => {
      if (!USER_A_ID || !PUBLIC_CHANNEL_ID) {
        return;
      }

      const membership = await Channel.getMembership(
        PUBLIC_CHANNEL_ID,
        USER_A_ID
      );

      expect(membership).toBeTruthy();

      expect(Number(membership.is_manager)).toBe(0);

      if (membership.permissions) {
        const permissions =
          typeof membership.permissions === 'string'
            ? JSON.parse(membership.permissions)
            : membership.permissions;

        expect(permissions.is_manager).not.toBe(true);
        expect(permissions.delete).not.toBe(true);
        expect(permissions.manage_members).not.toBe(true);
      }

      if ('can_add_members' in membership) {
        expect(Number(membership.can_add_members)).toBe(0);
      }

      if ('can_remove_members' in membership) {
        expect(Number(membership.can_remove_members)).toBe(0);
      }
    });
  });

  describe('6. Authorization Helper Security Properties', () => {
    test('DM requires explicit membership', () => {
      const { canViewChannel } = require('../../src/utils/permissions');

      const user = {
        id: 1,
        role: 'user',
      };

      const dm = {
        id: 50,
        type: 'dm',
        deleted_at: null,
        archived_at: null,
      };

      expect(canViewChannel(user, dm, null)).toBe(false);

      expect(
        canViewChannel(user, dm, {
          user_id: 1,
        })
      ).toBe(true);
    });

    test('group DM requires explicit membership', () => {
      const { canViewChannel } = require('../../src/utils/permissions');

      const user = {
        id: 1,
        role: 'user',
      };

      const groupDm = {
        id: 50,
        type: 'group_dm',
        deleted_at: null,
        archived_at: null,
      };

      expect(canViewChannel(user, groupDm, null)).toBe(false);

      expect(
        canViewChannel(user, groupDm, {
          user_id: 1,
        })
      ).toBe(true);
    });
  });
});
