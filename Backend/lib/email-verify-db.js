let emailVerifyReady = null;

async function hasEmailVerifyColumns(pool) {
  if (emailVerifyReady !== null) return emailVerifyReady;
  try {
    const result = await pool.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'email_verified'
       LIMIT 1`
    );
    emailVerifyReady = result.rows.length > 0;
  } catch (err) {
    console.warn('Email verify schema check:', err.message);
    emailVerifyReady = false;
  }
  return emailVerifyReady;
}

function resetEmailVerifySchemaCache() {
  emailVerifyReady = null;
}

module.exports = {
  hasEmailVerifyColumns,
  resetEmailVerifySchemaCache,
};
