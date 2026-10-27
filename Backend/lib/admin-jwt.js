const crypto = require('crypto');

const SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'stageflow-admin-dev-change-me';
const TTL_SEC = Number(process.env.ADMIN_JWT_TTL_SEC || 60 * 60 * 12);

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function signAdminToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TTL_SEC,
  }));
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null;
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
  if (data.role !== 'platform_admin') return null;
  return data;
}

module.exports = { signAdminToken, verifyAdminToken };
