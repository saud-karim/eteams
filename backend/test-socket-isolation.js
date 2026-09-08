require('dotenv').config();
const { db } = require('./src/db/connection');
const http = require('http');
const { Server } = require('socket.io');
const { io: Client } = require('../web/node_modules/socket.io-client');
const { v4: uuidv4 } = require('uuid');
const { initSocket, emitToChannel } = require('./src/sockets');
const { signAccess } = require('./src/utils/token');

// We will mock express app
const express = require('express');

async function setupTestData() {
  const conn = await db.getConnection();
  
  // Create 3 Users: A (regular), B (regular), S (superadmin)
  const users = {
    A: { id: uuidv4(), name: 'User A', username: 'user_a_' + uuidv4().substring(0, 8), password_hash: '123', role: 'user', is_active: 1, token_version: 1 },
    B: { id: uuidv4(), name: 'User B', username: 'user_b_' + uuidv4().substring(0, 8), password_hash: '123', role: 'user', is_active: 1, token_version: 1 },
    S: { id: uuidv4(), name: 'Superadmin', username: 'superadmin_' + uuidv4().substring(0, 8), password_hash: '123', role: 'superadmin', is_active: 1, token_version: 1 },
  };

  for (const u of Object.values(users)) {
    await conn.query('INSERT INTO users (id, name, username, password_hash, role, is_active, token_version) VALUES (?, ?, ?, ?, ?, ?, ?)', [u.id, u.name, u.username, u.password_hash, u.role, u.is_active, u.token_version]);
  }

  // Create Channels: Public (PUB), Private (PRIV), DM (DM)
  const channels = {
    PUB: { id: uuidv4(), slug: 'pub', name: 'Pub', type: 'public', is_readonly: 0, is_mandatory: 0 },
    ANN: { id: uuidv4(), slug: 'ann', name: 'Ann', type: 'announcement', is_readonly: 1, is_mandatory: 0 },
    PRIV: { id: uuidv4(), slug: 'priv', name: 'Priv', type: 'private', is_readonly: 0, is_mandatory: 0 },
    DM: { id: uuidv4(), slug: 'dm-1', name: 'DM', type: 'dm', is_readonly: 0, is_mandatory: 0 },
    GDM: { id: uuidv4(), slug: 'gdm-1', name: 'GDM', type: 'group_dm', is_readonly: 0, is_mandatory: 0 },
  };

  for (const c of Object.values(channels)) {
    await conn.query('INSERT INTO channels (id, slug, name, type, is_readonly, is_mandatory, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [c.id, c.slug, c.name, c.type, c.is_readonly, c.is_mandatory, users.A.id]);
  }

  // Add memberships: B is in PRIV and DM and GDM. A is in none! S is in none (but is superadmin).
  await conn.query('INSERT INTO memberships (id, channel_id, user_id) VALUES (?, ?, ?)', [uuidv4(), channels.PRIV.id, users.B.id]);
  await conn.query('INSERT INTO memberships (id, channel_id, user_id) VALUES (?, ?, ?)', [uuidv4(), channels.DM.id, users.B.id]);
  await conn.query('INSERT INTO memberships (id, channel_id, user_id) VALUES (?, ?, ?)', [uuidv4(), channels.GDM.id, users.B.id]);

  conn.release();
  
  return { users, channels };
}

async function cleanupTestData(data) {
  const conn = await db.getConnection();
  for (const c of Object.values(data.channels)) {
    await conn.query('DELETE FROM memberships WHERE channel_id = ?', [c.id]);
    await conn.query('DELETE FROM channels WHERE id = ?', [c.id]);
  }
  for (const u of Object.values(data.users)) {
    await conn.query('DELETE FROM users WHERE id = ?', [u.id]);
  }
  conn.release();
}

async function runTests() {
  console.log('--- Starting Socket Isolation Tests ---');
  let data;
  try {
    data = await setupTestData();
    console.log('Test data created.');

    const app = express();
    const server = http.createServer(app);
    initSocket(server);
    
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;
    console.log('Server listening on port', port);

    // Create client connections
    const connectClient = (user) => {
      return new Promise((resolve) => {
        const token = signAccess({ sub: user.id, role: user.role, token_version: user.token_version });
        const client = new Client(`http://localhost:${port}`, { auth: { token } });
        client.on('connect', () => resolve(client));
      });
    };

    const clientA = await connectClient(data.users.A);
    const clientB = await connectClient(data.users.B);
    const clientS = await connectClient(data.users.S);

    console.log('Clients connected.');

    const tryJoin = (client, channelId) => {
      return new Promise((resolve) => {
        client.emit('channel:join', { channelId });
        setTimeout(() => resolve(), 100); // give it 100ms to process
      });
    };

    const testEvent = (client, channelId, eventName, payload) => {
      return new Promise((resolve) => {
        const listener = (data) => {
          if (data.testId === payload.testId) {
            client.off(eventName, listener);
            resolve(true);
          }
        };
        client.on(eventName, listener);
        emitToChannel(channelId, eventName, payload);
        setTimeout(() => {
          client.off(eventName, listener);
          resolve(false);
        }, 200);
      });
    };

    const results = [];
    const assertTest = async (name, client, channel, shouldReceive) => {
      await tryJoin(client, channel.id);
      const testId = uuidv4();
      const received = await testEvent(client, channel.id, 'message:new', { testId });
      const pass = received === shouldReceive;
      console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`);
      if (!pass) console.log(`   -> Expected receive=${shouldReceive}, got receive=${received}`);
      results.push(pass);
    };

    // Tests for User A (Non-Member)
    await assertTest('1. Non-member -> Public Channel -> Join Allowed', clientA, data.channels.PUB, true);
    await assertTest('2. Non-member -> Announcement Channel -> Join Allowed', clientA, data.channels.ANN, true);
    await assertTest('3. Non-member -> Private Channel -> Join Denied', clientA, data.channels.PRIV, false);
    await assertTest('4. Non-member -> DM -> Join Denied', clientA, data.channels.DM, false);
    await assertTest('5. Non-member -> Group DM -> Join Denied', clientA, data.channels.GDM, false);

    // Tests for User B (Member)
    await assertTest('6. Member -> Private Channel -> Join Allowed', clientB, data.channels.PRIV, true);
    await assertTest('7. Member -> DM -> Join Allowed', clientB, data.channels.DM, true);
    await assertTest('8. Member -> Group DM -> Join Allowed', clientB, data.channels.GDM, true);

    // Tests for User S (Superadmin)
    await assertTest('9. Superadmin -> Private Channel (Non-member) -> Join Allowed', clientS, data.channels.PRIV, true);

    // Test 10: Unauthorized random ID
    const randomCh = { id: uuidv4() };
    await assertTest('10. Random Channel ID -> Join Denied', clientA, randomCh, false);

    // Test 11: Cross-channel isolation
    console.log('Testing cross-channel socket isolation...');
    const testIdCross = uuidv4();
    let receivedCross = false;
    clientA.on('message:new', (payload) => { if (payload.testId === testIdCross) receivedCross = true; });
    // Emit to Private Channel, which A is not a member of (but tried to join in test 3)
    emitToChannel(data.channels.PRIV.id, 'message:new', { testId: testIdCross });
    await new Promise(r => setTimeout(r, 200));
    const passCross = !receivedCross;
    console.log(`[${passCross ? 'PASS' : 'FAIL'}] 11. User A (in public channel) did not receive events from Private Channel`);
    results.push(passCross);

    // Test 12: All event types
    console.log('Testing all event types authorization...');
    const eventTypes = ['message:new', 'message:updated', 'message:deleted', 'message:read', 'message:reactions', 'typing:start', 'typing:stop'];
    let allEventsPass = true;
    for (const evt of eventTypes) {
       const id = uuidv4();
       const received = await testEvent(clientA, data.channels.PUB.id, evt, { testId: id });
       if (!received) allEventsPass = false;
    }
    console.log(`[${allEventsPass ? 'PASS' : 'FAIL'}] 12. All events (new, updated, read, etc) function correctly in authorized channels`);
    results.push(allEventsPass);

    clientA.disconnect();
    clientB.disconnect();
    clientS.disconnect();
    server.close();
    
    if (results.includes(false)) {
      console.error('SOME TESTS FAILED.');
      process.exit(1);
    } else {
      console.log('ALL TESTS PASSED SUCCESSFULLY.');
      process.exit(0);
    }
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (data) await cleanupTestData(data);
    process.exit();
  }
}

runTests();
