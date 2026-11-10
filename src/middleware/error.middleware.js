/**
 * Central sanitized error handler middleware
 * Security: Hides internal stack traces from clients and logs internally.
 */
function errorHandler(err, req, res, next) {
  console.error('[SERVER_ERROR]', {
    message: err.message,
    status: err.status || 500,
    path: req.originalUrl,
    method: req.method,
    stack: err.stack
  });

  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 ? 'An internal server error occurred' : err.message;

  res.status(statusCode).json({
    error: message,
    status: statusCode
  });
}

module.exports = { errorHandler };
