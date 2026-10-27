const fs = require('fs');
const path = require('path');
const { getPool } = require('./db');
const { hashPassword } = require('./password');
const { invalidateAdminVerificationCache } = require('./admin-verification-db');

async function runAdminSqlPatch(pool) {
  const patchPath = path.join(__dirname, '..', 'supabase', 'patches', '007-admin-system.sql');
  const sql = fs.readFileSync(patchPath, 'utf8');
  await pool.query(sql);
  invalidateAdminVerificationCache();
}

async function ensurePlatformAdmin(pool) {
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || '';
  if (!email || !password || password.length < 8) return;

  const existing = await pool.query(
    `SELECT id FROM users WHERE role = 'platform_admin' LIMIT 1`
  );
  if (existing.rows.length) return;

  const loginId = email.split('@')[0].toUpperCase().slice(0, 24) || 'ADMIN';
  const hash = hashPassword(password);
  await pool.query(
    `INSERT INTO users (email, login_id, password_hash, role, display_name, is_active, email_verified)
     VALUES ($1, $2, $3, 'platform_admin', $4, TRUE, TRUE)
     ON CONFLICT (email) DO NOTHING`,
    [email, loginId, hash, 'Administrateur StageFlow']
  );
  console.log('[StageFlow] Compte platform_admin initial créé pour', email);
}

async function runAdminSystemSetup() {
  if (!process.env.DATABASE_URL) return;
  try {
    const pool = getPool();
    await runAdminSqlPatch(pool);
    await ensurePlatformAdmin(pool);
  } catch (err) {
    console.warn('[StageFlow] Admin system setup:', err.message);
  }
}

module.exports = { runAdminSystemSetup, runAdminSqlPatch, ensurePlatformAdmin };
