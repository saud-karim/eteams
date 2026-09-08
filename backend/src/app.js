const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error');

const app = express();

const rateLimit = require('express-rate-limit');

// 1. Strict API Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow frontend/mobile to read resources (images/attachments)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"], // Deny all by default for API endpoints
      frameAncestors: ["'none'"], // Prevent clickjacking
      formAction: ["'none'"] // Prevent form submissions directly to the API
    }
  },
  xFrameOptions: { action: 'deny' }
}));

// 2. Global Rate Limiter (DoS Protection)
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // Limit each IP to 200 requests per `window` (here, per minute)
  message: { error: 'Too many requests from this IP, please try again after a minute.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(globalLimiter);

// 3. Stricter Auth Limiter (Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per window
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/signup', authLimiter);

const env = require('./config/env');
const allowedOrigins = ['http://localhost:5173', 'http://localhost:8081', 'http://10.0.2.2:8081'];
if (env.cors.origin) {
  env.cors.origin.split(',').forEach(o => allowedOrigins.push(o.trim()));
}
app.use(cors({ 
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.') || origin === env.cors.origin) {
      callback(null, true);
    } else {
      console.error('[ERROR] Not allowed by CORS Error: Not allowed by CORS', origin);
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));



app.get('/health', (_, res) => res.json({ ok: true, service: 'eteams-backend' }));

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
