const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccess(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.accessTtl, algorithm: 'HS256' });
}

function signRefresh() {
  return crypto.randomBytes(32).toString('hex');
}

function verify(token) {
  return jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccess, signRefresh, verify, hashToken };
