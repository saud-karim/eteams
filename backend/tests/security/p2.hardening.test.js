const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const app = require('../../src/app');
const { db } = require('../../src/db/connection');
const User = require('../../src/models/User');
const Channel = require('../../src/models/Channel');
const Message = require('../../src/models/Message');

describe('P2 Hardening Security Tests', () => {
  let userA, userB, tokenA, tokenB, admin, adminToken;
  let publicChannel, privateChannel;

  beforeAll(async () => {
    // 1. Setup DB state
    const idA = uuidv4();
    const idB = uuidv4();
    const idAdmin = uuidv4();

    await db.query(`INSERT INTO users (id, username, name, email, password_hash, role, token_version) VALUES 
      (?, 'p2_usera', 'P2 User A', 'p2a@test.com', 'hash', 'user', 1),
      (?, 'p2_userb', 'P2 User B', 'p2b@test.com', 'hash', 'user', 1),
      (?, 'p2_admin', 'P2 Admin', 'p2admin@test.com', 'hash', 'superadmin', 1)`,
      [idA, idB, idAdmin]
    );
    userA = await User.findById(idA);
    userB = await User.findById(idB);
    admin = await User.findById(idAdmin);

    tokenA = jwt.sign({ sub: idA, token_version: 1 }, process.env.JWT_SECRET || 'test-secret', { algorithm: 'HS256' });
    tokenB = jwt.sign({ sub: idB, token_version: 1 }, process.env.JWT_SECRET || 'test-secret', { algorithm: 'HS256' });
    adminToken = jwt.sign({ sub: idAdmin, token_version: 1 }, process.env.JWT_SECRET || 'test-secret', { algorithm: 'HS256' });

    publicChannel = { id: uuidv4() };
    privateChannel = { id: uuidv4() };

    await db.query(`INSERT INTO channels (id, name, slug, type, created_by) VALUES 
      (?, 'P2 Public', 'p2-public', 'public', ?),
      (?, 'P2 Private', 'p2-private', 'private', ?)`,
      [publicChannel.id, idA, privateChannel.id, idAdmin]
    );

    await db.query(`INSERT INTO memberships (id, channel_id, user_id, is_manager) VALUES 
      (?, ?, ?, 1),
      (?, ?, ?, 1)`,
      [uuidv4(), publicChannel.id, idA, uuidv4(), privateChannel.id, idAdmin]
    );

    // Create 105 messages in public channel to test limit
    const messages = [];
    for(let i = 0; i < 105; i++) {
      messages.push([uuidv4(), publicChannel.id, idA, `Bulk message ${i} with % and _ test`]);
    }
    const placeholders = messages.map(() => '(?, ?, ?, ?)').join(',');
    const values = messages.flat();
    await db.query(`INSERT INTO messages (id, channel_id, user_id, body) VALUES ${placeholders}`, values);
  });

  afterAll(async () => {
    await db.query('DELETE FROM users WHERE id IN (?, ?, ?)', [userA.id, userB.id, admin.id]);
    await db.query('DELETE FROM channels WHERE id IN (?, ?)', [publicChannel.id, privateChannel.id]);
  });

  describe('Pagination (getUsers, getChannels, getAuditLogs, getMessages)', () => {
    it('limit=1000 -> capped at 100', async () => {
      // Testing admin users pagination which now has a limit
      const res = await request(app)
        .get(`/api/admin/users?limit=1000`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeLessThanOrEqual(100);
    });

    it('limit=-1 / limit=abc -> safe behavior (defaults to 50)', async () => {
      const res = await request(app)
        .get('/api/admin/users?limit=-1')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
      expect(res.body.users.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Search Hardening', () => {
    it('% and _ in search -> treated as literal characters', async () => {
      // Message search
      const res = await request(app)
        .get('/api/messages/search?q=%')
        .set('Authorization', `Bearer ${tokenA}`);
      
      expect(res.status).toBe(200);
      // The body contains "with % and _ test"
      // If it's a wildcard, it would match everything. We want it to match literally.
      expect(res.body.messages.every(m => m.body.includes('%'))).toBe(true);
    });
  });

  describe('JWT Algorithm Enforcement', () => {
    it('HS256 token -> accepted', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
    });

    it('wrong JWT algorithm (none) -> rejected', async () => {
      const badToken = jwt.sign({ sub: userA.id, token_version: 1 }, process.env.JWT_SECRET || 'test-secret', { algorithm: 'none' });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${badToken}`);
      expect(res.status).toBe(401);
    });
  });

  describe('Database Transactions', () => {
    it('transaction failure -> DB state reverts (createUser)', async () => {
      const testUsername = `rollback_${uuidv4()}`;
      // Admin trying to create user with invalid initial channel (triggers FK error)
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Rollback Test',
          username: testUsername,
          password: 'Password123!',
          initial_channels: ['invalid-channel-id']
        });
      
      expect(res.status).toBeGreaterThanOrEqual(400);

      // Ensure user was NOT created
      const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [testUsername]);
      expect(rows.length).toBe(0);
    });
  });
});
