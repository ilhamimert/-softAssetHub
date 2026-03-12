const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

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
  // 500+ hatalarında üretimde iç hata detayları sızdırılmaz
  const safeMessage = (statusCode >= 500 && process.env.NODE_ENV === 'production')
    ? 'Sunucu hatası oluştu.'
    : (err.message || 'Sunucu hatası oluştu.');
  res.status(statusCode).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
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
