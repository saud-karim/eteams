process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_TTL = '15m';

const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

const { db } = require('../../src/db/connection');
const { signAccess, signRefresh, hashToken } = require('../../src/utils/token');
const RefreshToken = require('../../src/models/RefreshToken');
const User = require('../../src/models/User');
const app = require('../../src/app');
const env = require('../../src/config/env');



describe('P1 Auth & Session Architecture Tests', () => {
  let userA, userB;
  let familyA;
  let validRefreshA, validHashA;

  beforeAll(async () => {
    userA = { id: uuidv4(), username: 'p1_test_a', email: 'p1_a@test.com' };
    userB = { id: uuidv4(), username: 'p1_test_b', email: 'p1_b@test.com' };
    
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('password123', 10);
    
    await db.query(`INSERT INTO users (id, username, name, email, password_hash, role, token_version) VALUES 
      (?, ?, 'Test A', ?, ?, 'user', 1),
      (?, ?, 'Test B', ?, ?, 'user', 1)`, 
      [userA.id, userA.username, userA.email, hash, userB.id, userB.username, userB.email, hash]
    );
  });

  afterAll(async () => {
    await db.query('DELETE FROM refresh_tokens WHERE user_id IN (?, ?)', [userA.id, userB.id]);
    await db.query('DELETE FROM users WHERE id IN (?, ?)', [userA.id, userB.id]);
  });

  describe('Access Tokens & token_version', () => {
    it('should include token_version and reject if mismatched', async () => {
      const accessToken = signAccess({ sub: userA.id, role: 'user', token_version: 1 });
      
      const res1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res1.status).toBe(200);

      // Increment version in DB manually
      await User.incrementTokenVersion(userA.id);

      const res2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res2.status).toBe(401);
      
      // Reset back for further tests
      await db.query('UPDATE users SET token_version = 1 WHERE id = ?', [userA.id]);
    });
  });

  describe('Refresh Token Operations', () => {
    beforeEach(async () => {
      await db.query('DELETE FROM refresh_tokens WHERE user_id = ?', [userA.id]);
      validRefreshA = signRefresh();
      validHashA = hashToken(validRefreshA);
      familyA = uuidv4();
      await RefreshToken.create(uuidv4(), userA.id, validHashA, familyA, new Date(Date.now() + 100000));
    });

    it('refresh token is not stored plaintext in DB', async () => {
      const [rows] = await db.query('SELECT * FROM refresh_tokens WHERE user_id = ?', [userA.id]);
      expect(rows[0].token_hash).not.toBe(validRefreshA);
      expect(rows[0].token_hash).toBe(validHashA);
    });

    it('valid refresh succeeds and rotates successfully', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${validRefreshA}`]);
      
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      
      // Check cookies for new refresh token
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/refreshToken=.*?HttpOnly/);
      
      // Verify old token is revoked
      const [old] = await db.query('SELECT * FROM refresh_tokens WHERE token_hash = ?', [validHashA]);
      expect(old.revoked_at).not.toBeNull();
      expect(old.replaced_by).not.toBeNull();
    });

    it('old refresh token cannot be reused successfully', async () => {
      // Rotate it once legally
      const res1 = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${validRefreshA}`]);
      expect(res1.status).toBe(200);
      
      // Now reuse it
      const res2 = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${validRefreshA}`]);
      
      expect(res2.status).toBe(401);
      expect(res2.body.error).toMatch(/Session compromised/i);
      
      // Family should be revoked
      const [tokens] = await db.query('SELECT * FROM refresh_tokens WHERE token_family = ?', [familyA]);
      for (const t of tokens) {
        expect(t.revoked_at).not.toBeNull();
      }
      
      // User token_version should increment
      const u = await User.findByIdAnyStatus(userA.id);
      expect(u.token_version).toBeGreaterThan(1);
    });

    it('concurrent refresh: exactly one succeeds, other fails and revokes family', async () => {
      // Reset user version
      await db.query('UPDATE users SET token_version = 1 WHERE id = ?', [userA.id]);
      
      // Run two concurrently
      const req1 = request(app).post('/api/auth/refresh').set('Cookie', [`refreshToken=${validRefreshA}`]);
      const req2 = request(app).post('/api/auth/refresh').set('Cookie', [`refreshToken=${validRefreshA}`]);
      
      const responses = await Promise.all([req1, req2]);
      
      const statuses = responses.map(r => r.status);
      expect(statuses.sort()).toEqual([200, 401]); // One success, one fail
      
      const u = await User.findByIdAnyStatus(userA.id);
      expect(u.token_version).toBe(2); // Incremented due to reuse
    });
  });

  describe('Logout & Password Change', () => {
    it('logout revokes refresh session and clears cookie', async () => {
      const rt = signRefresh();
      const hash = hashToken(rt);
      await RefreshToken.create(uuidv4(), userB.id, hash, uuidv4(), new Date(Date.now() + 100000));
      
      const accessToken = signAccess({ sub: userB.id, role: 'user', token_version: 1 });
      
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [`refreshToken=${rt}`]);
        
      expect(res.status).toBe(200);
      
      const [rows] = await db.query('SELECT * FROM refresh_tokens WHERE token_hash = ?', [hash]);
      expect(rows[0].revoked_at).not.toBeNull();
      
      expect(res.headers['set-cookie'][0]).toMatch(/refreshToken=;/);
    });

    it('password change requires correct old password', async () => {
      const accessToken = signAccess({ sub: userB.id, role: 'user', token_version: 1 });
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: 'wrong', newPassword: 'newpassword123' });
        
      expect(res.status).toBe(401);
    });

    it('password change invalidates previous sessions', async () => {
      // First set version to 1
      await db.query('UPDATE users SET token_version = 1 WHERE id = ?', [userB.id]);
      
      const rt = signRefresh();
      const hash = hashToken(rt);
      await RefreshToken.create(uuidv4(), userB.id, hash, uuidv4(), new Date(Date.now() + 100000));
      
      const accessToken = signAccess({ sub: userB.id, role: 'user', token_version: 1 });
      
      const res = await request(app)
        .put('/api/users/me/password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ oldPassword: 'password123', newPassword: 'newpassword123' });
        
      expect(res.status).toBe(200);
      
      // Token version should increment
      const u = await User.findByIdAnyStatus(userB.id);
      expect(u.token_version).toBeGreaterThan(1);
      
      // Session should be revoked
      const [rows] = await db.query('SELECT * FROM refresh_tokens WHERE token_hash = ?', [hash]);
      expect(rows[0].revoked_at).not.toBeNull();
      
      // Old access token should now be invalid
      const resAuth = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(resAuth.status).toBe(401);
    });
  });
});
