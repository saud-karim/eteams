const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

function signAccess(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.accessTtl });
}

function signRefresh(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.refreshTtl });
}

function verify(token) {
  return jwt.verify(token, env.jwt.secret);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccess, signRefresh, verify, hashToken };
