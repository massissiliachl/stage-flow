/**
 * CORS — mode développement : accepte toutes les origines (localhost, file:// → "null", etc.)
 * En production, définir NODE_ENV=production et CORS_ORIGINS dans .env
 */
function getCorsOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    return {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 204,
    };
  }

  const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const origins = [
    'http://localhost:3456',
    'http://127.0.0.1:3456',
    'https://stage-flow-6rl5.onrender.com',
    'https://stageflow-9775.onrender.com',
    ...extra,
  ];

  return {
    origin(origin, callback) {
      if (!origin || origin === 'null' || origins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origine CORS non autorisée : ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };
}

module.exports = { getCorsOptions };
