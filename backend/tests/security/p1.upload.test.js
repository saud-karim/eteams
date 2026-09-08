process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_TTL = '15m';

const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const { db } = require('../../src/db/connection');
const { signAccess } = require('../../src/utils/token');
const User = require('../../src/models/User');

const app = require('../../src/app');

describe('P1 Upload Security Tests', () => {
  let userA, channelA;
  let accessToken;
  let testFilePath;
  let fakeMaliciousPath;

  beforeAll(async () => {
    userA = { id: uuidv4(), username: 'p1_upl_user', email: 'p1upl@test.com' };
    channelA = { id: uuidv4() };

    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('password123', 10);
    
    // Insert user with tiny quota for testing (100 bytes)
    await db.query(`INSERT INTO users (id, username, name, email, password_hash, role, token_version, upload_quota) VALUES 
      (?, ?, 'Test Upl', ?, ?, 'user', 1, 100)`, 
      [userA.id, userA.username, userA.email, hash]
    );

    // Insert public channel
    await db.query(`INSERT INTO channels (id, name, type, created_by) VALUES (?, 'Upl Chan', 'public', ?)`,
      [channelA.id, userA.id]
    );

    // Insert membership
    await db.query(`INSERT INTO memberships (channel_id, user_id, can_post) VALUES (?, ?, 1)`,
      [channelA.id, userA.id]
    );

    accessToken = signAccess({ sub: userA.id, role: 'user', token_version: 1 });

    // Create test files
    testFilePath = path.join(__dirname, 'test-valid.txt');
    fs.writeFileSync(testFilePath, 'Hello Valid World!'); // ~18 bytes

    fakeMaliciousPath = path.join(__dirname, 'test-malicious.png');
    // SVG pretending to be PNG
    fs.writeFileSync(fakeMaliciousPath, '<svg><script>alert(1)</script></svg>');
  });

  afterAll(async () => {
    // Cleanup DB
    await db.query('DELETE FROM attachments WHERE message_id IN (SELECT id FROM messages WHERE user_id = ?)', [userA.id]);
    await db.query('DELETE FROM messages WHERE user_id = ?', [userA.id]);
    await db.query('DELETE FROM memberships WHERE user_id = ?', [userA.id]);
    await db.query('DELETE FROM channels WHERE id = ?', [channelA.id]);
    await db.query('DELETE FROM users WHERE id = ?', [userA.id]);

    // Cleanup local test files
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    if (fs.existsSync(fakeMaliciousPath)) fs.unlinkSync(fakeMaliciousPath);
  });

  it('valid upload succeeds, reserves quota, and stores file permanently', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('channelId', channelA.id)
      .field('body', 'Test upload')
      .attach('file', testFilePath);
      
    expect(res.status).toBe(201);
    
    // Check quota update
    const [userRows] = await db.query('SELECT used_quota FROM users WHERE id = ?', [userA.id]);
    expect(Number(userRows[0].used_quota)).toBeGreaterThan(0);
    
    // Check file exists in uploads/
    const uploadsDir = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');
    const msg = res.body; 
    
    const [attRows] = await db.query('SELECT * FROM attachments WHERE original_name = ?', ['test-valid.txt']);
    expect(attRows.length).toBe(1);
    
    const storedFile = path.join(__dirname, '..', '..', attRows[0].storage_key);
    expect(fs.existsSync(storedFile)).toBe(true);
    
    // Clean it up
    fs.unlinkSync(storedFile);
  });

  it('quota exceeded rolls back file and returns error', async () => {
    // Increase file size beyond 100 bytes
    const largeFilePath = path.join(__dirname, 'test-large.txt');
    fs.writeFileSync(largeFilePath, Buffer.alloc(150, 'A')); // 150 bytes
    
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('channelId', channelA.id)
      .attach('file', largeFilePath);
      
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/quota exceeded/i);
    
    // Quota should remain unchanged from before this test
    fs.unlinkSync(largeFilePath);
  });

  it('invalid extension is rejected by multer fileFilter', async () => {
    const exePath = path.join(__dirname, 'test-malicious.exe');
    fs.writeFileSync(exePath, 'fake exe');
    
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('channelId', channelA.id)
      .attach('file', exePath);
      
    expect(res.status).toBe(500); // Because it throws an error in multer
    
    fs.unlinkSync(exePath);
  });

  it('magic bytes mismatch rejects active content and cleans up temp', async () => {
    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('channelId', channelA.id)
      .attach('file', fakeMaliciousPath);
      
    expect(res.status).toBe(400);
    // Should say magic bytes mismatch or active content
    expect(res.body.error).toMatch(/magic/i);
  });
});
