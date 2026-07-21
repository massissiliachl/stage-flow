const express = require('express');
const { getPool } = require('../lib/db');
const { isStagePeriodEnded } = require('../lib/stage-dates');
const { parseSignaturesJson } = require('../lib/convention-map');

const router = express.Router();

function buildAttestationTemplate(conv) {
  const sig = parseSignaturesJson(conv.signatures);
  const parties = sig.parties || {};
  const st = parties.student || {};
  const ent = parties.entreprise || {};

  return {
    studentName: conv.student_name,
    matricule: st.matricule || '',
    specialty: st.specialty || conv.departement || '',
    university: st.university || 'Université Abderrahmane Mira — Béjaïa',
    faculte: conv.faculte || st.faculte || '',
    departement: conv.departement || st.departement || '',
    promotion: st.promotion || '',
    encadrantUniversitaire: st.encadrant || '',
    theme: conv.theme || st.theme || '',
    periode: conv.periode || st.duree || '',
    dateDebut: conv.date_debut || null,
    dateFin: conv.date_fin || null,
    conventionRef: conv.reference || '',
    entrepriseNom: conv.entreprise_nom,
    entrepriseAdresse: ent.adresse || '',
    encadrantEntreprise: ent.encadrant || '—',
  };
}

function mapAttestationRow(row) {
  return {
    id: row.id,
    conventionId: Number(row.convention_id),
    studentId: row.student_id,
    studentName: row.student_name,
    entrepriseId: row.entreprise_id ? Number(row.entreprise_id) : null,
    entrepriseNom: row.entreprise_nom || '',
    prefilled: row.prefilled || {},
    missions: row.missions,
    competences: row.competences,
    commentaire: row.commentaire || '',
    fileName: row.file_name || null,
    submittedAt: row.submitted_at,
    status: row.status,
  };
}

async function loadConvention(client, conventionId) {
  const result = await client.query('SELECT * FROM conventions WHERE id = $1', [conventionId]);
  return result.rows[0] || null;
}

router.get('/:conventionId', async (req, res) => {
  const conventionId = parseInt(req.params.conventionId, 10);
  if (!conventionId || Number.isNaN(conventionId)) {
    return res.status(400).json({ error: 'Identifiant convention invalide' });
  }
  try {
    const pool = getPool();
    const convResult = await pool.query('SELECT * FROM conventions WHERE id = $1', [conventionId]);
    const conv = convResult.rows[0];
    if (!conv) {
      return res.status(404).json({ error: 'Convention introuvable' });
    }

    const attResult = await pool.query(
      'SELECT * FROM stage_attestations WHERE convention_id = $1 LIMIT 1',
      [conventionId]
    );

    res.json({
      attestation: attResult.rows.length ? mapAttestationRow(attResult.rows[0]) : null,
      template: buildAttestationTemplate(conv),
    });
  } catch (err) {
    console.error('Get attestation error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement de l\'attestation' });
  }
});

router.post('/:conventionId', async (req, res) => {
  const conventionId = parseInt(req.params.conventionId, 10);
  const {
    studentName,
    studentId,
    missions,
    competences,
    commentaire,
    fileName,
  } = req.body || {};

  if (!conventionId || Number.isNaN(conventionId)) {
    return res.status(400).json({ error: 'Identifiant convention invalide' });
  }

  const nameTrim = (studentName || '').trim();
  const missionsTrim = (missions || '').trim();
  const competencesTrim = (competences || '').trim();

  if (!nameTrim || !missionsTrim || !competencesTrim) {
    return res.status(400).json({
      error: 'Nom étudiant, missions réalisées et compétences acquises sont obligatoires',
    });
  }
  if (missionsTrim.length < 50) {
    return res.status(400).json({ error: 'Décrivez les missions réalisées (minimum 50 caractères)' });
  }
  if (competencesTrim.length < 30) {
    return res.status(400).json({ error: 'Décrivez les compétences acquises (minimum 30 caractères)' });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const conv = await loadConvention(client, conventionId);
    if (!conv) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Convention introuvable' });
    }

    if ((conv.student_name || '').trim() !== nameTrim) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cette attestation ne correspond pas à votre convention' });
    }

    if (!conv.signed_entreprise || !conv.signed_universite) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'La convention doit être signée (entreprise + université) avant l\'envoi de l\'attestation',
      });
    }

    if (!isStagePeriodEnded(conv.date_fin)) {
      await client.query('ROLLBACK');
      const finLabel = conv.date_fin ? String(conv.date_fin).slice(0, 10) : '—';
      return res.status(409).json({
        error: `L'envoi de l'attestation est possible à partir de la fin du stage (${finLabel})`,
        dateFin: conv.date_fin,
      });
    }

    const existing = await client.query(
      'SELECT id FROM stage_attestations WHERE convention_id = $1',
      [conventionId]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Une attestation a déjà été envoyée pour cette convention' });
    }

    const prefilled = buildAttestationTemplate(conv);

    const insert = await client.query(
      `INSERT INTO stage_attestations (
         convention_id, student_id, student_name, entreprise_id, entreprise_nom,
         prefilled, missions, competences, commentaire, file_name, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'submitted')
       RETURNING *`,
      [
        conventionId,
        studentId || conv.student_id || null,
        nameTrim,
        conv.entreprise_id,
        conv.entreprise_nom,
        JSON.stringify(prefilled),
        missionsTrim,
        competencesTrim,
        (commentaire || '').trim() || null,
        (fileName || '').trim() || null,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Attestation de stage envoyée — téléchargeable par l\'entreprise d\'accueil',
      attestation: mapAttestationRow(insert.rows[0]),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Submit attestation error:', err.message);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Attestation déjà envoyée pour cette convention' });
    }
    res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'attestation' });
  } finally {
    client.release();
  }
});

module.exports = {
  mapAttestationRow,
  buildAttestationTemplate,
  stageAttestationsRouter: router,
};
