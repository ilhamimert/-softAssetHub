const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const routes = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ── Nginx reverse proxy güveni ────────────────────────────────────
app.set('trust proxy', 1);

// ── Gzip sıkıştırma ───────────────────────────────────────────────
app.use(compression({ level: 6, threshold: 1024 }));

// ── Helmet — hardened CSP + security headers ──────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws://localhost:5000', 'ws://localhost:3000', 'wss://ilhami.yesiloz.net'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // WebSocket uyumluluğu için
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// ── CORS — whitelist tabanlı, * değil ────────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001,http://localhost:5050')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // İzin verilen originler veya tool/curl gibi origin başlığı olmayan istekler (dev)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: ${origin} izin verilmiyor.`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parser — küçük limit (10mb → 512kb) ─────────────────────
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

// ── 30 saniyelik istek zaman aşımı ───────────────────────────────
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(503).json({ success: false, error: 'REQUEST_TIMEOUT', message: 'İstek zaman aşımına uğradı.' });
  });
  next();
});

// ── HTTP logger (sadece development) ─────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Sağlık kontrolü — rate limit öncesi ──────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Broadcast Asset Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Rate limiting ─────────────────────────────────────────────────
// Login: 10 başarısız deneme / 15 dakika
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_REQUESTS', message: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
});

// Genel API: 150 istek / dakika
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_REQUESTS', message: 'İstek limiti aşıldı. Lütfen bekleyin.' },
  skip: (req) => req.path === '/health',
});

app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1', apiLimiter);

// ── API rotaları ──────────────────────────────────────────────────
app.use('/api/v1', routes);

// ── 404 ───────────────────────────────────────────────────────────
app.use(notFound);

// ── Global hata yakalayıcı ────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
