const express = require('express');
const { getPool } = require('../lib/db');

const router = express.Router();

async function countQuery(pool, sql) {
  try {
    const result = await pool.query(sql);
    return Number(result.rows[0]?.count) || 0;
  } catch (err) {
    console.warn('[stats]', err.message);
    return 0;
  }
}

/**
 * GET /api/stats/public
 * Statistiques réelles pour la page d'accueil (sans authentification).
 */
router.get('/public', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json({
      students: 0,
      companies: 0,
      universityAccounts: 0,
      conventionsFinalized: 0,
      paperRequired: 0,
    });
  }

  try {
    const pool = getPool();
    const [students, companies, universityAccounts, conventionsFinalized] = await Promise.all([
      countQuery(
        pool,
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role = 'etudiant' AND is_active IS NOT FALSE`
      ),
      countQuery(
        pool,
        `SELECT COUNT(*)::int AS count FROM entreprises
         WHERE is_active IS NOT FALSE`
      ),
      countQuery(
        pool,
        `SELECT COUNT(*)::int AS count FROM users
         WHERE role IN ('admin_universite', 'admin_faculte', 'admin_departement', 'responsable_stages')
           AND is_active IS NOT FALSE`
      ),
      countQuery(
        pool,
        `SELECT COUNT(*)::int AS count FROM conventions
         WHERE status IN ('signed', 'archived')
            OR (signed_entreprise = TRUE AND signed_universite = TRUE)`
      ),
    ]);

    res.json({
      students,
      companies,
      universityAccounts,
      conventionsFinalized,
      paperRequired: 0,
    });
  } catch (err) {
    console.error('Public stats error:', err.message);
    res.status(500).json({ error: 'Impossible de charger les statistiques' });
  }
});

module.exports = router;
