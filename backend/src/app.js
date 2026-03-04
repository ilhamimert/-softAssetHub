const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const routes  = require('./routes/index');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Güvenlik başlıkları
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP logger (sadece development)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Broadcast Asset Management API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API rotaları
app.use('/api/v1', routes);

// 404
app.use(notFound);

// Global hata yakalayıcı
app.use(errorHandler);

module.exports = app;
