const request = require('supertest');
const app = require('../../src/app');
const { db } = require('../../src/db/connection');
const User = require('../../src/models/User');
const { signAccess } = require('../../src/utils/token');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

describe('P4 Security: Admin Hierarchy', () => {
  let superadminToken, fulladminToken, normalToken;
  let superadmin, fulladmin, normaluser;

  beforeAll(async () => {
    // Clear users
    await db.query('DELETE FROM users');

    const password_hash = await bcrypt.hash('password123', 10);

    superadmin = {
      id: uuidv4(),
      username: 'superadmin',
      name: 'Super Admin',
      password_hash,
      role: 'superadmin',
      is_active: 1,
      token_version: 1
    };

    fulladmin = {
      id: uuidv4(),
      username: 'fulladmin',
      name: 'Full Admin',
      password_hash,
      role: 'user',
      permissions: JSON.stringify({ 'admin-access': true }),
      is_active: 1,
      token_version: 1
    };

    normaluser = {
      id: uuidv4(),
      username: 'normaluser',
      name: 'Normal User',
      password_hash,
      role: 'user',
      is_active: 1,
      token_version: 1
    };

    await db.query(`INSERT INTO users (id, username, name, password_hash, role, is_active, token_version, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [superadmin.id, superadmin.username, superadmin.name, superadmin.password_hash, superadmin.role, superadmin.is_active, superadmin.token_version, null]
    );

    await db.query(`INSERT INTO users (id, username, name, password_hash, role, is_active, token_version, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [fulladmin.id, fulladmin.username, fulladmin.name, fulladmin.password_hash, fulladmin.role, fulladmin.is_active, fulladmin.token_version, fulladmin.permissions]
    );

    await db.query(`INSERT INTO users (id, username, name, password_hash, role, is_active, token_version, permissions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [normaluser.id, normaluser.username, normaluser.name, normaluser.password_hash, normaluser.role, normaluser.is_active, normaluser.token_version, null]
    );

    superadminToken = signAccess({ sub: superadmin.id, token_version: 1 });
    fulladminToken = signAccess({ sub: fulladmin.id, token_version: 1 });
    normalToken = signAccess({ sub: normaluser.id, token_version: 1 });
  });

  afterAll(async () => {
    await db.query('DELETE FROM users');
  });

  it('Normal user cannot access admin APIs', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${normalToken}`);
    expect(res.status).toBe(403);
  });

  it('Full Admin CAN access admin APIs', async () => {
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${fulladminToken}`);
    expect(res.status).toBe(200);
  });

  it('Full Admin CANNOT modify a Superadmin', async () => {
    const res = await request(app).put(`/api/admin/users/${superadmin.id}`).set('Authorization', `Bearer ${fulladminToken}`).send({
      name: 'Hacked Admin'
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Cannot modify a superadmin');
  });

  it('Superadmin CAN modify a Full Admin', async () => {
    const res = await request(app).put(`/api/admin/users/${fulladmin.id}`).set('Authorization', `Bearer ${superadminToken}`).send({
      name: 'Updated Full Admin',
      username: fulladmin.username,
      role: 'user',
      permissions: { 'admin-access': true }
    });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Updated Full Admin');
  });

  it('Full Admin CANNOT grant themselves or others superadmin role', async () => {
    const res = await request(app).put(`/api/admin/users/${normaluser.id}`).set('Authorization', `Bearer ${fulladminToken}`).send({
      role: 'superadmin'
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Cannot grant superadmin role');
  });

  it('Full Admin CANNOT grant admin-access permission', async () => {
    const res = await request(app).put(`/api/admin/users/${normaluser.id}`).set('Authorization', `Bearer ${fulladminToken}`).send({
      role: 'user',
      permissions: { 'admin-access': true }
    });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Cannot grant admin-access');
  });

  it('Full Admin CAN update normal user without touching admin-access', async () => {
    const res = await request(app).put(`/api/admin/users/${normaluser.id}`).set('Authorization', `Bearer ${fulladminToken}`).send({
      name: 'Normal User 2',
      username: normaluser.username,
      role: 'user',
      permissions: { 'edit-own': true }
    });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Normal User 2');
    expect(JSON.parse(res.body.user.permissions)['admin-access']).toBeFalsy();
  });

  it('Full Admin CAN send a broadcast (Workspace admin capability)', async () => {
    const res = await request(app).post('/api/broadcasts').set('Authorization', `Bearer ${fulladminToken}`).send({
      type: 'maintenance',
      recipients: 'all',
      messageBody: 'Test broadcast from Full Admin'
    });
    expect(res.status).toBe(200);
    expect(res.body.broadcast.message_body).toBe('Test broadcast from Full Admin');
  });

  it('Normal User CANNOT send a broadcast', async () => {
    const res = await request(app).post('/api/broadcasts').set('Authorization', `Bearer ${normalToken}`).send({
      type: 'maintenance',
      recipients: 'all',
      messageBody: 'Test broadcast'
    });
    expect(res.status).toBe(403);
  });

  it('Full Admin CAN create mandatory announcement channels (Workspace admin capability)', async () => {
    const res = await request(app).post('/api/channels').set('Authorization', `Bearer ${fulladminToken}`).send({
      name: 'Mandatory Channel',
      type: 'announcement',
      is_mandatory: true
    });
    expect(res.status).toBe(201);
    expect(res.body.channel.name).toBe('Mandatory Channel');
  });

});
