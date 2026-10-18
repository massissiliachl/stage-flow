const express = require('express');
const { getPool } = require('../lib/db');
const { registerUniversityStructure } = require('../lib/student-academic');

const router = express.Router();

/**
 * POST /api/universities/structure
 * Enregistre une université et/ou une faculté pour l'inscription étudiant (PostgreSQL).
 */
router.post('/structure', async (req, res) => {
  const university = (req.body && req.body.university) || '';
  const faculte = (req.body && req.body.faculte) || '';
  const logo = (req.body && req.body.logo) || '';

  try {
    const pool = getPool();
    const result = await registerUniversityStructure(pool, university, faculte, logo);
    if (!result.ok) {
      return res.status(result.error === 'Base de données indisponible' ? 503 : 400).json({ error: result.error });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Universities structure error:', err.message);
    res.status(500).json({ error: 'Impossible d\'enregistrer la structure universitaire' });
  }
});

module.exports = router;
