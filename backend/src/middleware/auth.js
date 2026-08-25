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
  'search-history': false
};

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token || null);
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = verify(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    
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

module.exports = { requireAuth, requireRole, DEFAULT_PERMISSIONS };
