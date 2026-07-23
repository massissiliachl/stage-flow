const crypto = require('crypto');
const { hasEmailVerifyColumns } = require('./email-verify-db');

const TOKEN_BYTES = 32;
const TOKEN_TTL_HOURS = Number(process.env.EMAIL_VERIFY_TTL_HOURS || 24);

function generateToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

function getFrontendBase() {
  return (process.env.FRONTEND_URL || 'https://stageflow-9775.onrender.com').replace(/\/$/, '');
}

function buildVerificationUrl(token) {
  return `${getFrontendBase()}/verify-email.html?token=${encodeURIComponent(token)}`;
}

async function createVerificationForUser(client, userId) {
  const token = generateToken();
  const expires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await client.query(
    `UPDATE users SET
       email_verified = FALSE,
       email_verification_token = $1,
       email_verification_expires = $2,
       updated_at = NOW()
     WHERE id = $3`,
    [token, expires, userId]
  );

  return {
    token,
    expires,
    verifyUrl: buildVerificationUrl(token),
  };
}

async function verifyEmailToken(pool, token) {
  const trimmed = (token || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Token de vérification manquant' };
  }

  const result = await pool.query(
    `SELECT id, email, role, display_name, email_verification_expires, email_verified
     FROM users
     WHERE email_verification_token = $1`,
    [trimmed]
  );

  if (!result.rows.length) {
    return { ok: false, error: 'Lien invalide ou déjà utilisé' };
  }

  const row = result.rows[0];

  if (row.email_verified) {
    return {
      ok: true,
      alreadyVerified: true,
      email: row.email,
      role: row.role,
      name: row.display_name,
    };
  }

  if (!row.email_verification_expires || new Date(row.email_verification_expires) < new Date()) {
    return {
      ok: false,
      expired: true,
      error: 'Ce lien a expiré. Demandez un nouvel email de vérification.',
      email: row.email,
      role: row.role,
    };
  }

  await pool.query(
    `UPDATE users SET
       email_verified = TRUE,
       email_verification_token = NULL,
       email_verification_expires = NULL,
       updated_at = NOW()
     WHERE id = $1`,
    [row.id]
  );

  return {
    ok: true,
    email: row.email,
    role: row.role,
    name: row.display_name,
  };
}

async function issueVerificationEmail(client, { userId, email, name, role }) {
  const { getPool } = require('./db');
  const enabled = await hasEmailVerifyColumns(getPool());
  if (!enabled) {
    return { skipped: true, sent: false, devMode: false };
  }

  const { verifyUrl } = await createVerificationForUser(client, userId);
  const { sendVerificationEmail } = require('./mail');
  const mailResult = await sendVerificationEmail({ to: email, name, verifyUrl, role });
  return { verifyUrl, ...mailResult };
}

module.exports = {
  buildVerificationUrl,
  createVerificationForUser,
  verifyEmailToken,
  issueVerificationEmail,
};
