/** Limite simple par IP (fenêtre glissante en mémoire). */
const buckets = new Map();
const WINDOW_MS = 60 * 1000;

function rateLimit({ max = 30, keyPrefix = '' } = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    let entry = buckets.get(key);
    if (!entry || now - entry.start > WINDOW_MS) {
      entry = { start: now, count: 0 };
      buckets.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans une minute.' });
    }
    next();
  };
}

module.exports = { rateLimit };
