function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

function buildCorsOptions() {
  const extras = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const front = (process.env.FRONTEND_URL || '').trim();
  const allowed = new Set([front, ...extras].filter(Boolean));
  const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return callback(null, true);
      }
      if (!isProd) return callback(null, true);
      if (allowed.has(origin)) return callback(null, true);
      callback(new Error('CORS: origine non autorisée'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };
}

module.exports = { securityHeaders, buildCorsOptions };
