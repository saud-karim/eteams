if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing. Application cannot start securely.');
}

module.exports = {
  port: process.env.PORT || 4000,
  jwt: {
    secret: process.env.JWT_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxMb: parseInt(process.env.MAX_UPLOAD_MB || '25', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};
