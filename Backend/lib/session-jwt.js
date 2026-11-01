const crypto = require('crypto');

const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const SECRET =
  process.env.APP_JWT_SECRET ||
  process.env.JWT_SECRET ||
  process.env.ADMIN_JWT_SECRET ||
  (!isProd ? 'stageflow-dev-secret-min-16chars' : null);
const TTL_SEC = Number(process.env.APP_JWT_TTL_SEC || 60 * 60 * 8);

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function signAppToken(payload) {
  if (!SECRET || SECRET.length < 16) {
    throw new Error('APP_JWT_SECRET manquant ou trop court (min. 16 caractères)');
  }
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  }));
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyAppToken(token) {
  if (!SECRET || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
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

module.exports = { signAppToken, verifyAppToken };
