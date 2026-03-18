const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);
  if (err.stack) console.error(err.stack);

  // PostgreSQL hataları (err.code string)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'DUPLICATE_ENTRY',
      message: 'Bu kayıt zaten mevcut.',
    });
  }
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'FOREIGN_KEY_VIOLATION',
      message: 'İlişkili kayıt bulunamadı veya silinemez.',
    });
  }
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      error: 'CHECK_VIOLATION',
      message: 'Geçersiz değer.',
    });
  }

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  // 500+ hatalarında üretimde iç hata detayları sızdırılmaz
  const safeMessage = (statusCode >= 500 && isProduction)
    ? 'Sunucu hatası oluştu.'
    : (err.message || 'Sunucu hatası oluştu.');
  const safeCode = (statusCode >= 500 && isProduction)
    ? 'INTERNAL_SERVER_ERROR'
    : (err.code || 'INTERNAL_SERVER_ERROR');
  res.status(statusCode).json({
    success: false,
    error: safeCode,
    message: safeMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Endpoint bulunamadı: ${req.method} ${req.originalUrl}`,
  });
};

const createError = (message, statusCode = 400, code = 'BAD_REQUEST') => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
};

module.exports = { errorHandler, notFound, createError };
