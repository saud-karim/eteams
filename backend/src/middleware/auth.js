const { verify } = require('../utils/token');
const User = require('../models/User');

const DEFAULT_PERMISSIONS = {
  'edit-own': true,
  'delete-own': true,
  'react': true,
  'thread': true,
  'dm-anyone': true,
  'dm-exec': false,
  'dm-ceo': false,
  'group-dm': true,
  'at-user': true,
  'at-here': true,
  'at-channel': false,
  'at-everyone': false,
  'upload': true,
  'upload-large': false,
  'create-public': false,
  'create-private': false,
  'create-announcement': false,
  'search-history': false,
  'admin-access': false
};

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = header.slice(7);
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = verify(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (payload.token_version !== user.token_version) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    if (typeof user.permissions === 'string') {
      try {
        user.permissions = { ...DEFAULT_PERMISSIONS, ...JSON.parse(user.permissions) };
      } catch (e) {
        user.permissions = { ...DEFAULT_PERMISSIONS };
      }
    } else if (!user.permissions) {
      user.permissions = { ...DEFAULT_PERMISSIONS };
    } else {
      user.permissions = { ...DEFAULT_PERMISSIONS, ...user.permissions };
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(403).json({ error: 'Forbidden' });
  const { isAdmin } = require('../utils/roles');
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user) return res.status(403).json({ error: 'Forbidden' });
  const { isSuperAdmin } = require('../utils/roles');
  if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Forbidden' });
  next();
}

module.exports = { requireAuth, requireRole, requireAdmin, requireSuperAdmin, DEFAULT_PERMISSIONS };
