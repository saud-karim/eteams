const { verify } = require('../utils/token');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = verify(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    if (typeof user.permissions === 'string') {
      try {
        user.permissions = JSON.parse(user.permissions);
      } catch (e) {
        user.permissions = {};
      }
    } else if (!user.permissions) {
      user.permissions = {};
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

module.exports = { requireAuth, requireRole };
