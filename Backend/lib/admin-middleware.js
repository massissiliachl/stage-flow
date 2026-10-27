const { verifyAdminToken } = require('./admin-jwt');
const { getPool } = require('./db');

async function requirePlatformAdmin(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const decoded = verifyAdminToken(token);
  if (!decoded?.sub) {
    return res.status(401).json({ error: 'Authentification administrateur requise' });
  }
  try {
    const pool = getPool();
    const r = await pool.query(
      `SELECT id, email, display_name, role, is_active
       FROM users WHERE id = $1 AND role = 'platform_admin'`,
      [decoded.sub]
    );
    if (!r.rows.length || r.rows[0].is_active === false) {
      return res.status(403).json({ error: 'Compte administrateur invalide ou désactivé' });
    }
    req.adminUser = r.rows[0];
    next();
  } catch (err) {
    console.error('requirePlatformAdmin:', err.message);
    res.status(500).json({ error: 'Erreur authentification admin' });
  }
}

module.exports = { requirePlatformAdmin };
