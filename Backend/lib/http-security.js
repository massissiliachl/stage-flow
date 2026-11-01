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

/** Origines front connues (Render) — repli si FRONTEND_URL absent sur l’API. */
const DEFAULT_FRONTEND_ORIGINS = [
  'https://stageflow-9775.onrender.com',
];

function buildCorsOptions() {
  const extras = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const front = (process.env.FRONTEND_URL || '').trim();
  const allowed = new Set([front, ...extras, ...DEFAULT_FRONTEND_ORIGINS].filter(Boolean));
  const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  /** Hébergement Render du front (évite blocage CORS si variable d’env oubliée). */
  const renderFrontRe = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i;

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return callback(null, true);
      }
      if (!isProd) return callback(null, true);
      if (allowed.has(origin)) return callback(null, true);
      if (renderFrontRe.test(origin)) return callback(null, true);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };
}

module.exports = { securityHeaders, buildCorsOptions };
