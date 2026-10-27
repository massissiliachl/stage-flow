const express = require('express');
const { getPool, isDatabaseUnavailable, describeDatabaseError } = require('../lib/db');
const { verifyPassword } = require('../lib/password');
const { signAdminToken } = require('../lib/admin-jwt');
const { requirePlatformAdmin } = require('../lib/admin-middleware');

const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ ok: true, service: 'auth-admin' });
});

router.post('/login', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, email, password_hash, display_name, is_active
       FROM users WHERE email = $1 AND role = 'platform_admin'`,
      [email]
    );
    if (!result.rows.length) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const row = result.rows[0];
    if (row.is_active === false) {
      return res.status(403).json({ error: 'Compte administrateur désactivé' });
    }
    if (!verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    await pool.query(
      'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [row.id]
    );

    const token = signAdminToken({ sub: row.id, role: 'platform_admin', email: row.email });
    res.json({
      message: 'Connexion administrateur réussie',
      token,
      admin: {
        id: row.id,
        email: row.email,
        name: row.display_name || 'Administrateur',
      },
    });
  } catch (err) {
    console.error('Admin login:', err.message);
    if (isDatabaseUnavailable(err)) {
      return res.status(503).json({ error: describeDatabaseError(err) });
    }
    res.status(500).json({ error: 'Erreur de connexion' });
  }
});

router.get('/me', requirePlatformAdmin, (req, res) => {
  res.json({
    admin: {
      id: req.adminUser.id,
      email: req.adminUser.email,
      name: req.adminUser.display_name || 'Administrateur',
    },
  });
});

module.exports = router;
