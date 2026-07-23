const express = require('express');
const { getPool } = require('../lib/db');
const { mapConventionRow } = require('../lib/convention-map');
const { createOrUpdateConventionForDemand } = require('../lib/convention-service');
const { mapReportRow } = require('./stage-reports');
const { mapAttestationRow } = require('./stage-attestations');

const router = express.Router();

function mapDemande(row) {
  const date = row.demand_date
    ? (row.demand_date instanceof Date
        ? row.demand_date.toISOString().slice(0, 10)
        : String(row.demand_date).slice(0, 10))
    : '';
  return {
    id: Number(row.id),
    company: row.entreprise_nom,
    entrepriseId: row.entreprise_id ? Number(row.entreprise_id) : null,
    status: row.status,
    date,
    theme: row.theme || '',
    encadrant: row.encadrant || '—',
    studentName: row.student_name || '—',
    studentLabel: row.student_name || '—',
    duree: row.duree || '',
    fromDb: true,
  };
}

function mapProfile(row) {
  const logo = row.entreprise_logo || {};
  return {
    entreprise: {
      id: row.entreprise_id,
      nom: row.entreprise_nom,
      secteur: row.secteur || '',
      wilaya: row.wilaya || '',
      adresse: row.adresse || logo.adresse || '',
      phone: row.phone || row.user_phone || '',
      email: row.email_contact || row.email || '',
      nif: row.nif || '',
      nrc: row.nrc || '',
      nis: row.nis || '',
      identifiant: row.identifiant || row.login_id || '',
      encadrant: row.encadrant_ent || logo.encadrant_stage || '',
    },
    user: {
      id: row.user_id,
      name: row.display_name || 'Direction RH',
      email: row.email || '',
      identifiant: row.login_id || '',
      avatar: row.avatar || '',
      encadrant_ent: row.encadrant_ent || '',
      phone: row.user_phone || row.phone || '',
    },
  };
}

/**
 * GET /api/entreprise/:entrepriseId/profile
 */
router.get('/:entrepriseId/profile', async (req, res) => {
  const entrepriseId = parseInt(req.params.entrepriseId, 10);
  if (!entrepriseId || Number.isNaN(entrepriseId)) {
    return res.status(400).json({ error: 'Identifiant entreprise invalide' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.login_id,
         u.display_name,
         u.avatar,
         u.encadrant_ent,
         u.phone AS user_phone,
         e.id AS entreprise_id,
         e.nom AS entreprise_nom,
         e.secteur,
         e.wilaya,
         e.adresse,
         e.phone,
         e.email_contact,
         e.nif,
         e.nrc,
         e.nis,
         e.identifiant,
         e.logo AS entreprise_logo
       FROM entreprises e
       LEFT JOIN users u ON u.entreprise_id = e.id AND u.role = 'entreprise'
       WHERE e.id = $1
       LIMIT 1`,
      [entrepriseId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Entreprise introuvable' });
    }

    res.json(mapProfile(result.rows[0]));
  } catch (err) {
    console.error('Profile entreprise GET error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement du profil' });
  }
});

/**
 * PATCH /api/entreprise/:entrepriseId/profile
 */
router.patch('/:entrepriseId/profile', async (req, res) => {
  const entrepriseId = parseInt(req.params.entrepriseId, 10);
  if (!entrepriseId || Number.isNaN(entrepriseId)) {
    return res.status(400).json({ error: 'Identifiant entreprise invalide' });
  }

  const {
    nom,
    secteur,
    wilaya,
    adresse,
    phone,
    email,
    nif,
    nrc,
    nis,
    encadrant,
  } = req.body || {};

  try {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id FROM entreprises WHERE id = $1',
        [entrepriseId]
      );
      if (!existing.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Entreprise introuvable' });
      }

      const userEncRes = await client.query(
        `SELECT encadrant_ent FROM users WHERE entreprise_id = $1 AND role = 'entreprise' LIMIT 1`,
        [entrepriseId]
      );
      const prevEncadrant = userEncRes.rows[0]?.encadrant_ent || null;

      await client.query(
        `UPDATE entreprises SET
           nom = COALESCE($2, nom),
           secteur = COALESCE($3, secteur),
           wilaya = COALESCE($4, wilaya),
           adresse = COALESCE($5, adresse),
           phone = COALESCE($6, phone),
           email_contact = COALESCE($7, email_contact),
           nif = COALESCE($8, nif),
           nrc = COALESCE($9, nrc),
           nis = COALESCE($10, nis),
           updated_at = NOW()
         WHERE id = $1`,
        [
          entrepriseId,
          nom?.trim() || null,
          secteur?.trim() || null,
          wilaya?.trim() || null,
          adresse?.trim() || null,
          phone?.trim() || null,
          email?.trim().toLowerCase() || null,
          nif ? String(nif).replace(/\D/g, '') : null,
          nrc?.trim().toUpperCase() || null,
          nis?.trim() || null,
        ]
      );

      if (encadrant !== undefined) {
        await client.query(
          `UPDATE users SET encadrant_ent = $2, updated_at = NOW()
           WHERE entreprise_id = $1 AND role = 'entreprise'`,
          [entrepriseId, encadrant?.trim() || null]
        );

        const newEnc = encadrant?.trim() || null;
        if (newEnc && !prevEncadrant) {
          // Create conventions for already-accepted demands lacking a convention
          const missingRes = await client.query(
            `SELECT d.* FROM stage_demands d
             WHERE d.entreprise_id = $1
               AND d.status = 'accepted'
               AND NOT EXISTS (
                 SELECT 1 FROM conventions c
                 WHERE c.entreprise_id = d.entreprise_id
                   AND c.student_name = d.student_name
                   AND c.status != 'archived'
               )
             ORDER BY d.id ASC`,
            [entrepriseId]
          );
          for (const demand of missingRes.rows) {
            await createOrUpdateConventionForDemand(client, demand, newEnc);
          }
        }
      }

      if (email) {
        await client.query(
          `UPDATE users SET email = $2, phone = COALESCE($3, phone), updated_at = NOW()
           WHERE entreprise_id = $1 AND role = 'entreprise'`,
          [entrepriseId, email.trim().toLowerCase(), phone?.trim() || null]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const refreshed = await pool.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.login_id,
         u.display_name,
         u.avatar,
         u.encadrant_ent,
         u.phone AS user_phone,
         e.id AS entreprise_id,
         e.nom AS entreprise_nom,
         e.secteur,
         e.wilaya,
         e.adresse,
         e.phone,
         e.email_contact,
         e.nif,
         e.nrc,
         e.nis,
         e.identifiant,
         e.logo AS entreprise_logo
       FROM entreprises e
       LEFT JOIN users u ON u.entreprise_id = e.id AND u.role = 'entreprise'
       WHERE e.id = $1
       LIMIT 1`,
      [entrepriseId]
    );

    res.json({
      message: 'Profil mis à jour',
      ...mapProfile(refreshed.rows[0]),
    });
  } catch (err) {
    console.error('Profile entreprise PATCH error:', err.message);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'NIF ou NRC déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

/**
 * GET /api/entreprise/:entrepriseId/dashboard
 * Demandes + conventions de l'entreprise connectée (PostgreSQL)
 */
router.get('/:entrepriseId/dashboard', async (req, res) => {
  const entrepriseId = parseInt(req.params.entrepriseId, 10);
  if (!entrepriseId || Number.isNaN(entrepriseId)) {
    return res.status(400).json({ error: 'Identifiant entreprise invalide' });
  }

  try {
    const pool = getPool();

    const entCheck = await pool.query(
      'SELECT id, nom FROM entreprises WHERE id = $1 AND is_active IS NOT FALSE',
      [entrepriseId]
    );
    if (!entCheck.rows.length) {
      return res.status(404).json({ error: 'Entreprise introuvable' });
    }

    const [demandesRes, conventionsRes] = await Promise.all([
      pool.query(
        `SELECT id, student_name, entreprise_id, entreprise_nom, theme, encadrant, status, demand_date, duree
         FROM stage_demands
         WHERE entreprise_id = $1
         ORDER BY demand_date DESC NULLS LAST, id DESC`,
        [entrepriseId]
      ),
      pool.query(
        `SELECT id, reference, student_name, entreprise_nom, theme, periode, status,
                signed_etudiant, signed_entreprise, signed_universite, faculte, departement, signatures,
                document_hash, final_integrity_hash, hash_algorithm, date_debut, date_fin
         FROM conventions
         WHERE entreprise_id = $1
         ORDER BY id DESC`,
        [entrepriseId]
      ),
    ]);

    res.json({
      entreprise: entCheck.rows[0],
      demandes: demandesRes.rows.map(mapDemande),
      conventions: conventionsRes.rows.map(mapConventionRow),
    });
  } catch (err) {
    console.error('Dashboard entreprise error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des données' });
  }
});

/**
 * GET /api/entreprise/:entrepriseId/rapports
 * Rapports de stage déposés par les stagiaires
 */
router.get('/:entrepriseId/rapports', async (req, res) => {
  const entrepriseId = parseInt(req.params.entrepriseId, 10);
  if (!entrepriseId || Number.isNaN(entrepriseId)) {
    return res.status(400).json({ error: 'Identifiant entreprise invalide' });
  }
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM stage_reports
       WHERE entreprise_id = $1
       ORDER BY submitted_at DESC`,
      [entrepriseId]
    );
    res.json({ rapports: result.rows.map(mapReportRow) });
  } catch (err) {
    console.error('Rapports entreprise error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des rapports' });
  }
});

/**
 * GET /api/entreprise/:entrepriseId/attestations
 * Attestations de stage envoyées par les stagiaires
 */
router.get('/:entrepriseId/attestations', async (req, res) => {
  const entrepriseId = parseInt(req.params.entrepriseId, 10);
  if (!entrepriseId || Number.isNaN(entrepriseId)) {
    return res.status(400).json({ error: 'Identifiant entreprise invalide' });
  }
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM stage_attestations
       WHERE entreprise_id = $1
       ORDER BY submitted_at DESC`,
      [entrepriseId]
    );
    res.json({ attestations: result.rows.map(mapAttestationRow) });
  } catch (err) {
    console.error('Attestations entreprise error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des attestations' });
  }
});

module.exports = router;
