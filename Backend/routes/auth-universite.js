const express = require('express');
const { getPool } = require('../lib/db');
const { verifyPassword } = require('../lib/password');
const { signAppToken } = require('../lib/session-jwt');
const { roleToUnivType } = require('../lib/require-universite-auth');
const { rateLimit } = require('../lib/rate-limit');

const router = express.Router();
const loginLimiter = rateLimit({ max: 25, keyPrefix: 'univ-login' });

const UNIV_ROLES = ['admin_universite', 'admin_faculte', 'admin_departement', 'responsable_stages'];

function normalizeLoginId(value) {
  return String(value || '').trim().toLowerCase();
}

function mapRowToFrontendUser(row, faculteName, deptName) {
  const type = roleToUnivType(row.role);
  return {
    id: row.id,
    type,
    email: row.email || row.login_id,
    name: row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    role_title: row.role_title || '',
    university: row.university_name || 'Université Abderrahmane Mira — Béjaïa',
    faculte: faculteName || null,
    departement: deptName || null,
    avatar: row.avatar || 'UN',
    parentId: null,
  };
}

router.get('/ping', (req, res) => {
  res.json({ ok: true, service: 'auth-universite' });
});

router.post('/login', loginLimiter, async (req, res) => {
  const login = normalizeLoginId(req.body?.email || req.body?.login_id);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!login || !password) {
    return res.status(400).json({ error: 'Email institutionnel et mot de passe requis' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.login_id,
         u.password_hash,
         u.role,
         u.display_name,
         u.first_name,
         u.last_name,
         u.avatar,
         u.role_title,
         u.is_active,
         uni.name AS university_name,
         f.name AS faculty_name,
         d.name AS department_name
       FROM users u
       LEFT JOIN universities uni ON uni.id = u.university_id
       LEFT JOIN faculties f ON f.id = u.faculty_id
       LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.role = ANY($2::text[])
         AND (
           lower(coalesce(u.email, '')) = $1
           OR lower(coalesce(u.login_id, '')) = $1
         )`,
      [login, UNIV_ROLES]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect', code: 'LOGIN_FAILED' });
    }

    const row = result.rows[0];
    if (row.is_active === false) {
      return res.status(403).json({ error: 'Ce compte est désactivé' });
    }
    if (!verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect', code: 'LOGIN_FAILED' });
    }

    const univType = roleToUnivType(row.role);
    if (!univType) {
      return res.status(403).json({ error: 'Rôle non autorisé pour cet espace' });
    }

    let token;
    try {
      token = signAppToken({
        aud: 'universite',
        sub: row.id,
        role: row.role,
        univType,
        email: row.email || row.login_id,
        faculte: row.faculty_name || null,
        departement: row.department_name || null,
      });
    } catch (e) {
      console.error('JWT sign error:', e.message);
      return res.status(503).json({
        error: 'Configuration serveur incomplète (APP_JWT_SECRET). Contactez l\'administrateur.',
      });
    }

    await pool.query('UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [row.id]);

    res.json({
      message: 'Connexion réussie',
      token,
      user: mapRowToFrontendUser(row, row.faculty_name, row.department_name),
    });
  } catch (err) {
    console.error('Login université error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

module.exports = router;
