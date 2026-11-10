/**
 * Structured request logger middleware
 * Conforms to security rules: structured logging, no sensitive payload/secret leakage.
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.connection.remoteAddress || '127.0.0.1'
    };

    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`[${level}] ${timestamp} ${logData.method} ${logData.url} ${logData.status} - ${logData.durationMs}ms`);
  });

  next();
}

module.exports = { requestLogger };
