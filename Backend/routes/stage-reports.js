const express = require('express');
const { getPool } = require('../lib/db');
const { isStagePeriodEnded } = require('../lib/stage-dates');

const router = express.Router();

function mapReportRow(row) {
  return {
    id: row.id,
    conventionId: Number(row.convention_id),
    studentId: row.student_id,
    studentName: row.student_name,
    entrepriseId: row.entreprise_id ? Number(row.entreprise_id) : null,
    entrepriseNom: row.entreprise_nom || '',
    title: row.title,
    summary: row.summary || '',
    content: row.content,
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
    const result = await pool.query(
      'SELECT * FROM stage_reports WHERE convention_id = $1 LIMIT 1',
      [conventionId]
    );
    res.json({ report: result.rows.length ? mapReportRow(result.rows[0]) : null });
  } catch (err) {
    console.error('Get rapport error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement du rapport' });
  }
});

router.post('/:conventionId', async (req, res) => {
  const conventionId = parseInt(req.params.conventionId, 10);
  const {
    studentName,
    studentId,
    title,
    summary,
    content,
    fileName,
  } = req.body || {};

  if (!conventionId || Number.isNaN(conventionId)) {
    return res.status(400).json({ error: 'Identifiant convention invalide' });
  }

  const titleTrim = (title || '').trim();
  const contentTrim = (content || '').trim();
  const nameTrim = (studentName || '').trim();

  if (!nameTrim || !titleTrim || !contentTrim) {
    return res.status(400).json({ error: 'Nom étudiant, titre et contenu du rapport sont obligatoires' });
  }
  if (contentTrim.length < 100) {
    return res.status(400).json({ error: 'Le rapport doit contenir au moins 100 caractères' });
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
      return res.status(403).json({ error: 'Ce rapport ne correspond pas à votre convention' });
    }

    if (!conv.signed_entreprise || !conv.signed_universite) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'La convention doit être signée (entreprise + université) avant le dépôt du rapport' });
    }

    if (!isStagePeriodEnded(conv.date_fin)) {
      await client.query('ROLLBACK');
      const finLabel = conv.date_fin ? String(conv.date_fin).slice(0, 10) : '—';
      return res.status(409).json({
        error: `Le dépôt du rapport est possible à partir de la fin du stage (${finLabel})`,
        dateFin: conv.date_fin,
      });
    }

    const existing = await client.query(
      'SELECT id FROM stage_reports WHERE convention_id = $1',
      [conventionId]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Un rapport a déjà été déposé pour cette convention' });
    }

    const insert = await client.query(
      `INSERT INTO stage_reports (
         convention_id, student_id, student_name, entreprise_id, entreprise_nom,
         title, summary, content, file_name, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted')
       RETURNING *`,
      [
        conventionId,
        studentId || conv.student_id || null,
        nameTrim,
        conv.entreprise_id,
        conv.entreprise_nom,
        titleTrim,
        (summary || '').trim() || null,
        contentTrim,
        (fileName || '').trim() || null,
      ]
    );

    await client.query(
      `UPDATE conventions SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [conventionId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Rapport de stage déposé — visible par l\'entreprise d\'accueil',
      report: mapReportRow(insert.rows[0]),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Submit rapport error:', err.message);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Rapport déjà déposé pour cette convention' });
    }
    res.status(500).json({ error: 'Erreur lors du dépôt du rapport' });
  } finally {
    client.release();
  }
});

module.exports = { mapReportRow, stageReportsRouter: router };
