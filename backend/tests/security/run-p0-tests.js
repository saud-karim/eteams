require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { db } = require('../../src/db/connection');
const { v4: uuidv4 } = require('uuid');
const { signAccess } = require('../../src/utils/token');
const Channel = require('../../src/models/Channel');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function setupFixtures() {
  console.log('Setting up fixtures...');
  // Create User A and B
  const userAId = uuidv4();
  const userBId = uuidv4();

  await db.query(`INSERT INTO users (id, username, name, email, password_hash, role) VALUES 
    (?, ?, 'Test A', ?, 'hash', 'user'),
    (?, ?, 'Test B', ?, 'hash', 'user')`, 
    [userAId, `test_a_${userAId}`, `a_${userAId}@example.com`, userBId, `test_b_${userBId}`, `b_${userBId}@example.com`]
  );

  // Generate Tokens
  const tokenA = signAccess({ sub: userAId });
  const tokenB = signAccess({ sub: userBId });

  // Create Channels
  const pubChannelId = uuidv4();
  const privChannelId = uuidv4();
  const privChannelBId = uuidv4();
  const dmChannelId = uuidv4();

  await db.query(`INSERT INTO channels (id, slug, name, type, created_by) VALUES 
    (?, ?, 'Public', 'public', ?),
    (?, ?, 'Private', 'private', ?),
    (?, ?, 'Private B', 'private', ?),
    (?, ?, 'DM A-B', 'dm', ?)`, 
    [pubChannelId, `pub_${pubChannelId}`, userAId, 
     privChannelId, `priv_${privChannelId}`, userAId, 
     privChannelBId, `privb_${privChannelBId}`, userBId,
     dmChannelId, `dm_${dmChannelId}`, userAId]
  );

  // Memberships
  // User A should NOT be a manager in pubChannel for the self-join test to work
  await Channel.addMember(pubChannelId, userAId, { is_manager: 0 });
  await Channel.addMember(pubChannelId, userBId, { is_manager: 0 });
  
  await Channel.addMember(privChannelId, userAId, { is_manager: 1 });
  // User B is NOT in private channel A
  
  await Channel.addMember(privChannelBId, userBId, { is_manager: 1 });
  // User A is NOT in private channel B
  
  await Channel.addMember(dmChannelId, userAId, { is_manager: 1 });
  await Channel.addMember(dmChannelId, userBId, { is_manager: 1 });

  // Messages & Attachments
  const msgAId = uuidv4();
  await db.query(`INSERT INTO messages (id, channel_id, user_id, body) VALUES (?, ?, ?, ?)`, 
    [msgAId, privChannelId, userAId, 'Test Message A']);

  const msgBId = uuidv4();
  await db.query(`INSERT INTO messages (id, channel_id, user_id, body) VALUES (?, ?, ?, ?)`, 
    [msgBId, privChannelBId, userBId, 'Test Message B']);

  const attAId = uuidv4();
  const attBId = uuidv4();
  const attPath = path.join(__dirname, '..', '..', 'uploads', 'test.txt');
  if (!fs.existsSync(path.dirname(attPath))) fs.mkdirSync(path.dirname(attPath), { recursive: true });
  fs.writeFileSync(attPath, 'Hello');

  await db.query(`INSERT INTO attachments (id, message_id, filename, original_name, storage_key, mime_type, size_bytes) VALUES 
    (?, ?, ?, ?, ?, ?, ?),
    (?, ?, ?, ?, ?, ?, ?)`, 
    [attAId, msgAId, 'testA.txt', 'testA.txt', 'uploads/test.txt', 'text/plain', 5,
     attBId, msgBId, 'testB.txt', 'testB.txt', 'uploads/test.txt', 'text/plain', 5]);

  return {
    userAId, userBId, tokenA, tokenB, pubChannelId, privChannelId, privChannelBId, dmChannelId, attAId, attBId, attPath
  };
}

async function cleanup(fixtures) {
  console.log('Cleaning up...');
  await db.query('DELETE FROM attachments WHERE id IN (?, ?)', [fixtures.attAId, fixtures.attBId]);
  await db.query('DELETE FROM messages WHERE channel_id IN (?, ?, ?, ?)', [fixtures.pubChannelId, fixtures.privChannelId, fixtures.privChannelBId, fixtures.dmChannelId]);
  await db.query('DELETE FROM memberships WHERE user_id IN (?, ?)', [fixtures.userAId, fixtures.userBId]);
  await db.query('DELETE FROM channels WHERE id IN (?, ?, ?, ?)', [fixtures.pubChannelId, fixtures.privChannelId, fixtures.privChannelBId, fixtures.dmChannelId]);
  await db.query('DELETE FROM users WHERE id IN (?, ?)', [fixtures.userAId, fixtures.userBId]);
  if (fs.existsSync(fixtures.attPath)) fs.unlinkSync(fixtures.attPath);
}

async function run() {
  let fixtures;
  try {
    fixtures = await setupFixtures();
    
    process.env.TEST_USER_A_TOKEN = fixtures.tokenA;
    process.env.TEST_USER_B_TOKEN = fixtures.tokenB;
    process.env.TEST_USER_A_ID = fixtures.userAId;
    process.env.TEST_PUBLIC_CHANNEL_ID = fixtures.pubChannelId;
    process.env.TEST_PRIVATE_CHANNEL_ID = fixtures.privChannelId;
    process.env.TEST_USER_A_ATTACHMENT_ID = fixtures.attAId;
    process.env.TEST_USER_B_ATTACHMENT_ID = fixtures.attBId; 

    console.log('Running Jest...');
    execSync('npx jest tests/security/p0.security.test.js --runInBand', { stdio: 'inherit' });
    console.log('Success!');
  } catch (err) {
    console.error('Test Failed:', err.message);
  } finally {
    if (fixtures) await cleanup(fixtures);
    process.exit(0);
  }
}

run();
