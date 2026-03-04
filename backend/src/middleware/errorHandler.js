const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // SQL Server hataları
  if (err.number) {
    if (err.number === 2627 || err.number === 2601) {
      return res.status(409).json({
        success: false,
        error: 'DUPLICATE_ENTRY',
        message: 'Bu kayıt zaten mevcut.',
      });
    }
    if (err.number === 547) {
      return res.status(400).json({
        success: false,
        error: 'FOREIGN_KEY_VIOLATION',
        message: 'İlişkili kayıt bulunamadı veya silinemez.',
      });
    }
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Sunucu hatası oluştu.',
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
