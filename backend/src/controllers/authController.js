const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { signAccess, signRefresh, hashToken } = require('../utils/token');
const { DEFAULT_PERMISSIONS } = require('../middleware/auth');
const RefreshToken = require('../models/RefreshToken');
const { getIo } = require('../sockets/index');

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });
}

const loginSchema = z.object({
  username: z.string().min(1).max(191),
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().min(3).max(191),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2).max(100),
  department: z.string().max(60).optional(),
  job_title: z.string().max(120).optional(),
});

const signupSchema = z.object({
  username: z.string().min(3).max(191),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2).max(100),
  department: z.string().max(60).optional(),
  job_title: z.string().max(120).optional(),
  employment_type: z.string().optional(),
  reports_to: z.string().uuid().optional().nullable(),
});

async function login(req, res, next) {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = await User.findByUsername(username);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    await User.updatePresence(user.id, 'online');
    await AuditLog.log(user.id, 'user.login', 'user', user.id, null, req.ip);

    const accessToken = signAccess({ sub: user.id, role: user.role, token_version: user.token_version });
    const refreshToken = signRefresh();
    const tokenHash = hashToken(refreshToken);
    const tokenFamily = uuidv4();
    
    await RefreshToken.create(uuidv4(), user.id, tokenHash, tokenFamily, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), req.headers['user-agent']);
    setRefreshCookie(res, refreshToken);

    const { password_hash, ...safe } = user;
    if (typeof safe.permissions === 'string') {
      try { safe.permissions = { ...DEFAULT_PERMISSIONS, ...JSON.parse(safe.permissions) }; } catch (e) { safe.permissions = { ...DEFAULT_PERMISSIONS }; }
    } else if (!safe.permissions) {
      safe.permissions = { ...DEFAULT_PERMISSIONS };
    } else {
      safe.permissions = { ...DEFAULT_PERMISSIONS, ...safe.permissions };
    }

    res.json({ user: safe, accessToken });
  } catch (err) { next(err); }
}

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await User.findByUsername(data.username);
    if (existing) return res.status(409).json({ error: 'Username already registered' });

    const password_hash = await bcrypt.hash(data.password, 10);
    const initials = data.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const colors = ['blue', 'emerald', 'amber', 'coral', 'purple'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const user = await User.create({
      id: uuidv4(),
      username: data.username,
      password_hash,
      name: data.name,
      avatar_initials: initials,
      avatar_color: color,
      role: 'user',
      department: data.department || null,
      job_title: data.job_title || null,
    });

    await AuditLog.log(user.id, 'user.register', 'user', user.id, null, req.ip);

    const accessToken = signAccess({ sub: user.id, role: user.role, token_version: user.token_version });
    const refreshToken = signRefresh();
    const tokenHash = hashToken(refreshToken);
    const tokenFamily = uuidv4();
    
    await RefreshToken.create(uuidv4(), user.id, tokenHash, tokenFamily, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), req.headers['user-agent']);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({ user, accessToken });
  } catch (err) { next(err); }
}

async function signup(req, res, next) {
  try {
    const data = signupSchema.parse(req.body);
    const existing = await User.findByUsername(data.username);
    if (existing) return res.status(409).json({ error: 'Username already registered' });

    const password_hash = await bcrypt.hash(data.password, 10);
    const initials = data.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const colors = ['blue', 'emerald', 'amber', 'coral', 'purple'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const user = await User.create({
      id: uuidv4(),
      username: data.username,
      password_hash,
      name: data.name,
      avatar_initials: initials,
      avatar_color: color,
      role: 'user',
      department: data.department || null,
      job_title: data.job_title || null,
      reports_to: data.reports_to || null,
      employment_type: data.employment_type || null,
      approval_status: 'pending',
      is_active: 0
    });

    await AuditLog.log(user.id, 'user.signup', 'user', user.id, { status: 'pending_approval' }, req.ip);

    res.status(201).json({ message: 'Signup successful. Pending admin approval.', user: { id: user.id, username: user.username, name: user.name, approval_status: user.approval_status } });
  } catch (err) { next(err); }
}

async function getManagers(req, res, next) {
  try {
    const { db } = require('../db/connection');
    const [rows] = await db.query(`SELECT id, name, department, role FROM users WHERE role IN ('admin', 'superadmin') AND is_active = 1 ORDER BY name ASC`);
    res.json({ managers: rows });
  } catch (err) { next(err); }
}

async function me(req, res) {
  res.json({ user: req.user });
}

async function logout(req, res) {
  await User.updatePresence(req.user.id, 'offline');
  await AuditLog.log(req.user.id, 'user.logout', 'user', req.user.id, null, req.ip);
  
  const token = req.cookies?.refreshToken;
  if (token) {
    const tokenHash = hashToken(token);
    const stored = await RefreshToken.findByHash(tokenHash);
    if (stored) {
      await RefreshToken.revoke(stored.id);
    }
  }
  clearRefreshCookie(res);
  
  const io = getIo();
  if (io) io.in(`user:${req.user.id}`).disconnectSockets();
  
  res.json({ ok: true });
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ error: 'Missing refresh token' });

    const tokenHash = hashToken(token);
    const stored = await RefreshToken.findByHash(tokenHash);

    if (!stored) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(stored.user_id);
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'User not found' });
    }

    if (stored.revoked_at) {
      // Reuse detection!
      await RefreshToken.revokeFamily(stored.token_family);
      await User.incrementTokenVersion(user.id);
      clearRefreshCookie(res);
      
      const io = getIo();
      if (io) io.in(`user:${user.id}`).disconnectSockets();
      
      return res.status(401).json({ error: 'Session compromised. Please login again.' });
    }

    if (new Date() > new Date(stored.expires_at)) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Rotate
    const newRefresh = signRefresh();
    const newHash = hashToken(newRefresh);
    const newId = uuidv4();

    const replaced = await RefreshToken.markReplacedAtomic(stored.id, newId);
    
    if (!replaced) {
      // It was already revoked concurrently! Treat as reuse.
      await RefreshToken.revokeFamily(stored.token_family);
      await User.incrementTokenVersion(user.id);
      clearRefreshCookie(res);
      
      const io = getIo();
      if (io) io.in(`user:${user.id}`).disconnectSockets();
      
      return res.status(401).json({ error: 'Session compromised. Please login again.' });
    }

    await RefreshToken.create(newId, user.id, newHash, stored.token_family, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), req.headers['user-agent']);
    
    setRefreshCookie(res, newRefresh);
    const accessToken = signAccess({ sub: user.id, role: user.role, token_version: user.token_version });

    res.json({ accessToken });
  } catch (err) { next(err); }
}

module.exports = { login, register, signup, getManagers, me, logout, refresh };
