const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { z } = require('zod');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { signAccess, signRefresh } = require('../utils/token');

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

    const accessToken = signAccess({ sub: user.id, role: user.role });
    const refreshToken = signRefresh({ sub: user.id });

    const { password_hash, ...safe } = user;
    res.json({ user: safe, accessToken, refreshToken });
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

    const accessToken = signAccess({ sub: user.id, role: user.role });
    const refreshToken = signRefresh({ sub: user.id });

    res.status(201).json({ user, accessToken, refreshToken });
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
  res.json({ ok: true });
}

module.exports = { login, register, signup, getManagers, me, logout };
