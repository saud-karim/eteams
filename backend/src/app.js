const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));

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
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

app.get('/health', (_, res) => res.json({ ok: true, service: 'eteams-backend' }));

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;
