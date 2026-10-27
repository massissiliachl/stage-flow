let cached = null;

async function hasAdminVerificationColumns(pool) {
  if (cached !== null) return cached;
  try {
    const r = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'entreprises' AND column_name = 'admin_verification_status'
       LIMIT 1`
    );
    cached = r.rows.length > 0;
  } catch (_) {
    cached = false;
  }
  return cached;
}

function invalidateAdminVerificationCache() {
  cached = null;
}

module.exports = {
  hasAdminVerificationColumns,
  invalidateAdminVerificationCache,
};
