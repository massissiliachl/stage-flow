const crypto = require('crypto');

const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const TTL_SEC = Number(process.env.APP_JWT_TTL_SEC || 60 * 60 * 8);

let cachedSecret;
let derivedSecretWarned = false;

/** Secret stable dérivé de DATABASE_URL si APP_JWT_SECRET oublié sur Render. */
function deriveJwtSecretFromDatabaseUrl() {
  const url = String(process.env.DATABASE_URL || '').trim();
  if (url.length < 24) return null;
  return crypto.createHash('sha256').update(`stageflow-app-jwt-v1:${url}`).digest('hex');
}

function resolveJwtSecret() {
  if (cachedSecret !== undefined) return cachedSecret;

  const explicit =
    process.env.APP_JWT_SECRET ||
    process.env.JWT_SECRET ||
    process.env.ADMIN_JWT_SECRET ||
    '';

  if (explicit && explicit.length >= 16) {
    cachedSecret = explicit;
    return cachedSecret;
  }

  if (!isProd) {
    cachedSecret = 'stageflow-dev-secret-min-16chars';
    return cachedSecret;
  }

  const derived = deriveJwtSecretFromDatabaseUrl();
  if (derived) {
    if (!derivedSecretWarned) {
      derivedSecretWarned = true;
      console.warn(
        '[StageFlow] APP_JWT_SECRET non défini — utilisation d’un secret dérivé de DATABASE_URL. ' +
          'Ajoutez APP_JWT_SECRET (32+ car.) dans les variables Render pour une config recommandée.'
      );
    }
    cachedSecret = derived;
    return cachedSecret;
  }

  cachedSecret = null;
  return null;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function signAppToken(payload) {
  const secret = resolveJwtSecret();
  if (!secret || secret.length < 16) {
    throw new Error('APP_JWT_SECRET manquant ou trop court (min. 16 caractères)');
  }
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  }));
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyAppToken(token) {
  const secret = resolveJwtSecret();
  if (!secret || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch (_) {
    return null;
  }
  if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

function isJwtConfigured() {
  return Boolean(resolveJwtSecret());
}

module.exports = { signAppToken, verifyAppToken, isJwtConfigured, resolveJwtSecret };
