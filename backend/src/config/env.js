module.exports = {
  port: process.env.PORT || 4000,
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxMb: parseInt(process.env.MAX_UPLOAD_MB || '25', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};
