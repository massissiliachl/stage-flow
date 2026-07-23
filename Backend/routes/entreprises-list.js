const express = require('express');
const { getPool } = require('../lib/db');
const { mapConventionRow, parseSignaturesJson } = require('../lib/convention-map');
const {
  computeDocumentHash,
  computeFinalIntegrityHash,
  buildStoredSignature,
  verifyConventionIntegrity,
  HASH_ALGORITHM,
} = require('../lib/convention-hash');
const {
  createOrUpdateConventionForDemand,
  ensureConventionsForStudent,
} = require('../lib/convention-service');
const {
  queryConventions,
  updateConventionSign,
  mapConventionRows,
} = require('../lib/convention-query');

const entreprisesRouter = express.Router();
const demandesRouter = express.Router();
const conventionsRouter = express.Router();

function mapEntrepriseListRow(row) {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  return {
    id: Number(row.id),
    name: row.nom,
    domain: row.domaine || 'Commerce & Distribution',
    sector: row.secteur || 'À définir',
    wilaya: row.wilaya || '—',
    offers: Number(row.offres) || 0,
    rating: row.note != null ? Number(row.note) : 0,
    tags: tags.length ? tags : [row.secteur || 'Stage'].filter(Boolean),
    identifiant: row.identifiant || '',
    fromDb: true,
  };
}

function mapDemandeRow(row) {
  const date = row.demand_date
    ? (row.demand_date instanceof Date
        ? row.demand_date.toISOString().slice(0, 10)
        : String(row.demand_date).slice(0, 10))
    : new Date().toISOString().slice(0, 10);
  return {
    id: Number(row.id),
    company: row.entreprise_nom,
    entrepriseId: row.entreprise_id ? Number(row.entreprise_id) : null,
    status: row.status,
    date,
    theme: row.theme || '',
    message: row.message || '',
    encadrant: row.encadrant || '—',
    studentName: row.student_name || '—',
    studentLabel: row.student_name || '—',
    duree: row.duree || '',
    fromDb: true,
  };
}

async function isStudentStageLocked(pool, studentName) {
  const result = await pool.query(
    `SELECT id FROM conventions
     WHERE student_name = $1
       AND signed_entreprise = TRUE
       AND signed_universite = TRUE
     LIMIT 1`,
    [studentName]
  );
  return result.rows.length > 0;
}

/**
 * GET /api/entreprises
 * Liste publique des entreprises inscrites en base
 */
entreprisesRouter.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, nom, domaine, secteur, wilaya, offres, note, tags, identifiant
       FROM entreprises
       WHERE is_active IS NOT FALSE
       ORDER BY nom ASC`
    );
    res.json({
      entreprises: result.rows.map(mapEntrepriseListRow),
      total: result.rows.length,
    });
  } catch (err) {
    console.error('List entreprises error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des entreprises' });
  }
});

/**
 * POST /api/demandes
 * Envoi d'une demande de stage par un étudiant
 */
demandesRouter.post('/', async (req, res) => {
  const {
    entrepriseId,
    entrepriseNom,
    studentId,
    studentName,
    studentLabel,
    theme,
    message,
    faculte,
    departement,
    duree,
  } = req.body || {};

  const entId = parseInt(entrepriseId, 10);
  const nomTrim = (entrepriseNom || '').trim();
  const nameTrim = (studentName || studentLabel || '').trim();
  const themeTrim = (theme || '').trim();

  if (!entId || Number.isNaN(entId)) {
    return res.status(400).json({ error: 'Entreprise requise' });
  }
  if (!nameTrim) {
    return res.status(400).json({ error: 'Nom étudiant requis' });
  }
  if (!themeTrim) {
    return res.status(400).json({ error: 'Thème de stage requis' });
  }

  try {
    const pool = getPool();

    if (await isStudentStageLocked(pool, nameTrim)) {
      return res.status(403).json({
        error: 'Convention signée (entreprise + université) — vous ne pouvez plus effectuer un autre stage',
      });
    }

    const ent = await pool.query(
      'SELECT id, nom FROM entreprises WHERE id = $1 AND is_active IS NOT FALSE',
      [entId]
    );
    if (!ent.rows.length) {
      return res.status(404).json({ error: 'Entreprise introuvable' });
    }

    const companyName = nomTrim || ent.rows[0].nom;

    const duplicate = await pool.query(
      `SELECT id FROM stage_demands
       WHERE entreprise_id = $1 AND student_name = $2 AND status IN ('pending', 'accepted')
       LIMIT 1`,
      [entId, nameTrim]
    );
    if (duplicate.rows.length) {
      return res.status(409).json({
        error: 'Vous avez déjà une demande en cours ou acceptée chez cette entreprise',
      });
    }

    const dureeTrim = (duree || '').trim() || '2 mois';

    const result = await pool.query(
      `INSERT INTO stage_demands (
         student_id, student_name, entreprise_id, entreprise_nom,
         theme, encadrant, status, demand_date, faculte, departement, duree
       ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', CURRENT_DATE, $7, $8, $9)
       RETURNING id, student_name, entreprise_id, entreprise_nom, theme, status, demand_date, encadrant, faculte, departement, duree`,
      [
        studentId || null,
        nameTrim,
        entId,
        companyName,
        themeTrim,
        null,
        faculte || null,
        departement || null,
        dureeTrim,
      ]
    );

    const row = result.rows[0];
    const motivation = message ? String(message).trim() : '';
    res.status(201).json({
      message: 'Demande envoyée — visible immédiatement par l\'entreprise',
      demande: {
        ...mapDemandeRow({ ...row, message: motivation }),
        studentLabel: studentLabel || nameTrim,
      },
    });
  } catch (err) {
    console.error('Create demande error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de la demande' });
  }
});

/**
 * PATCH /api/demandes/:demandeId/accept
 * Accepte une demande et crée automatiquement une convention en base
 */
demandesRouter.patch('/:demandeId/accept', async (req, res) => {
  const demandeId = parseInt(req.params.demandeId, 10);
  const { entrepriseId, encadrant } = req.body || {};

  if (!demandeId || Number.isNaN(demandeId)) {
    return res.status(400).json({ error: 'Identifiant demande invalide' });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const demandRes = await client.query(
      'SELECT * FROM stage_demands WHERE id = $1 FOR UPDATE',
      [demandeId]
    );
    if (!demandRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const demand = demandRes.rows[0];

    if (demand.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cette demande a déjà été traitée' });
    }

    const entId = parseInt(entrepriseId, 10);
    if (entId && !Number.isNaN(entId) && Number(demand.entreprise_id) !== entId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cette demande n\'appartient pas à votre entreprise' });
    }

    let enc = (encadrant || '').trim();
    if (!enc) {
      const encRes = await client.query(
        `SELECT encadrant_ent FROM users WHERE entreprise_id = $1 AND role = 'entreprise' LIMIT 1`,
        [demand.entreprise_id]
      );
      enc = encRes.rows[0]?.encadrant_ent || null;
    }

    // Require a valid encadrant when accepting a demand
    if (!enc || enc === '—') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Encadrant entreprise requis pour accepter la demande' });
    }

    await client.query(
      `UPDATE stage_demands SET status = 'accepted', encadrant = $2, updated_at = NOW() WHERE id = $1`,
      [demandeId, enc]
    );

    const convention = await createOrUpdateConventionForDemand(client, { ...demand, encadrant: enc }, enc);

    await client.query('COMMIT');

    const updated = await pool.query('SELECT * FROM stage_demands WHERE id = $1', [demandeId]);
    const row = updated.rows[0];

    res.json({
      message: 'Demande acceptée — convention créée en base',
      demande: {
        ...mapDemandeRow(row),
        studentLabel: row.student_name,
      },
      convention,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Accept demande error:', err.message, err.stack);
    res.status(500).json({
      error: 'Erreur lors de l\'acceptation de la demande',
      detail: err.message,
    });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/demandes/:demandeId/reject
 * Refuse une demande de stage
 */
demandesRouter.patch('/:demandeId/reject', async (req, res) => {
  const demandeId = parseInt(req.params.demandeId, 10);
  const { entrepriseId } = req.body || {};

  if (!demandeId || Number.isNaN(demandeId)) {
    return res.status(400).json({ error: 'Identifiant demande invalide' });
  }

  try {
    const pool = getPool();
    const existing = await pool.query('SELECT * FROM stage_demands WHERE id = $1', [demandeId]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const demand = existing.rows[0];
    if (demand.status !== 'pending') {
      return res.status(409).json({ error: 'Cette demande a déjà été traitée' });
    }

    const entId = parseInt(entrepriseId, 10);
    if (entId && !Number.isNaN(entId) && Number(demand.entreprise_id) !== entId) {
      return res.status(403).json({ error: 'Cette demande n\'appartient pas à votre entreprise' });
    }

    const result = await pool.query(
      `UPDATE stage_demands SET status = 'rejected', updated_at = NOW() WHERE id = $1
       RETURNING *`,
      [demandeId]
    );
    const row = result.rows[0];

    res.json({
      message: 'Demande refusée',
      demande: {
        ...mapDemandeRow(row),
        studentLabel: row.student_name,
      },
    });
  } catch (err) {
    console.error('Reject demande error:', err.message);
    res.status(500).json({ error: 'Erreur lors du refus de la demande' });
  }
});

/**
 * PATCH /api/demandes/:demandeId/cancel
 * Annulation d'une demande en attente par l'étudiant
 */
demandesRouter.patch('/:demandeId/cancel', async (req, res) => {
  const demandeId = parseInt(req.params.demandeId, 10);
  const { studentName } = req.body || {};
  const nameTrim = (studentName || '').trim();

  if (!demandeId || Number.isNaN(demandeId)) {
    return res.status(400).json({ error: 'Identifiant demande invalide' });
  }
  if (!nameTrim) {
    return res.status(400).json({ error: 'Nom étudiant requis' });
  }

  try {
    const pool = getPool();
    const existing = await pool.query('SELECT * FROM stage_demands WHERE id = $1', [demandeId]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const demand = existing.rows[0];
    if (demand.student_name !== nameTrim) {
      return res.status(403).json({ error: 'Cette demande ne vous appartient pas' });
    }
    if (demand.status !== 'pending') {
      return res.status(409).json({ error: 'Seules les demandes en attente peuvent être annulées' });
    }

    const result = await pool.query(
      `UPDATE stage_demands SET status = 'cancelled', updated_at = NOW() WHERE id = $1
       RETURNING *`,
      [demandeId]
    );
    const row = result.rows[0];

    res.json({
      message: 'Demande annulée',
      demande: {
        ...mapDemandeRow(row),
        studentLabel: row.student_name,
      },
    });
  } catch (err) {
    console.error('Cancel demande error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la demande' });
  }
});

demandesRouter.get('/', async (req, res) => {
  const studentName = (req.query.studentName || '').trim();
  if (!studentName) {
    return res.status(400).json({ error: 'Paramètre studentName requis' });
  }
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, student_name, entreprise_id, entreprise_nom, theme, status, demand_date, encadrant, duree
       FROM stage_demands
       WHERE student_name = $1
       ORDER BY demand_date DESC NULLS LAST, id DESC`,
      [studentName]
    );
    res.json({
      demandes: result.rows.map((row) => ({
        ...mapDemandeRow(row),
        studentLabel: row.student_name,
      })),
    });
  } catch (err) {
    console.error('List demandes étudiant error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des demandes' });
  }
});

/**
 * GET /api/conventions?studentName=...
 * Conventions d'un étudiant (depuis la base)
 */
conventionsRouter.get('/stage-locked', async (req, res) => {
  const studentName = (req.query.studentName || '').trim();
  if (!studentName) {
    return res.status(400).json({ error: 'Paramètre studentName requis' });
  }
  try {
    const pool = getPool();
    const locked = await isStudentStageLocked(pool, studentName);
    res.json({ locked });
  } catch (err) {
    res.status(500).json({ error: 'Erreur vérification stage' });
  }
});

/**
 * PATCH /api/conventions/:conventionId/sign
 * Enregistre une signature en base (entreprise / université / étudiant)
 */
conventionsRouter.patch('/:conventionId/sign', async (req, res) => {
  const convId = parseInt(req.params.conventionId, 10);
  const { role, signature } = req.body || {};

  if (!convId || Number.isNaN(convId)) {
    return res.status(400).json({ error: 'Identifiant convention invalide' });
  }
  if (!role || !['entreprise', 'universite'].includes(role)) {
    return res.status(400).json({ error: 'Seuls l\'entreprise et la doyenne (université) peuvent signer la convention' });
  }
  if (!signature || (signature.type !== 'type' && signature.type !== 'draw')) {
    return res.status(400).json({ error: 'Signature invalide' });
  }
  if (signature.type === 'draw' && !signature.data) {
    return res.status(400).json({ error: 'Signature graphique manquante' });
  }
  if (signature.type === 'type' && !String(signature.text || '').trim()) {
    return res.status(400).json({ error: 'Nom de signature manquant' });
  }

  try {
    const pool = getPool();
    const existing = await pool.query('SELECT * FROM conventions WHERE id = $1', [convId]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Convention introuvable' });
    }

    const row = existing.rows[0];
    if (role === 'entreprise' && row.signed_entreprise) {
      return res.status(409).json({ error: 'Convention déjà signée par l\'entreprise' });
    }
    if (role === 'universite' && row.signed_universite) {
      return res.status(409).json({ error: 'Convention déjà signée par l\'université' });
    }

    const sig = parseSignaturesJson(row.signatures);
    const documentHash = computeDocumentHash(row, sig);
    sig[role] = buildStoredSignature(convId, role, signature, documentHash);

    let signedEtudiant = Boolean(row.signed_etudiant);
    let signedEntreprise = Boolean(row.signed_entreprise);
    let signedUniversite = Boolean(row.signed_universite);

    if (role === 'entreprise') signedEntreprise = true;
    if (role === 'universite') signedUniversite = true;

    let status = row.status;
    if (signedEntreprise && signedUniversite) {
      status = 'signed';
    } else if (signedEntreprise || signedUniversite) {
      status = status === 'archived' ? status : 'active';
    }

    const finalIntegrityHash = computeFinalIntegrityHash(
      documentHash,
      sig.entreprise,
      sig.universite
    );

    const upd = await updateConventionSign(pool, {
      convId,
      sigJson: JSON.stringify(sig),
      signedEtudiant,
      signedEntreprise,
      signedUniversite,
      status,
      documentHash,
      finalIntegrityHash,
    });

    res.json({
      message: 'Signature enregistrée',
      convention: mapConventionRow(upd.rows[0]),
      integrity: {
        documentHash,
        signatureHash: sig[role].hash,
        finalIntegrityHash,
        algorithm: HASH_ALGORITHM,
      },
      stageLocked: signedEntreprise && signedUniversite,
    });
  } catch (err) {
    console.error('Convention sign error:', err.message);
    res.status(500).json({
      error: 'Erreur lors de l\'enregistrement de la signature',
      detail: err.message,
    });
  }
});

conventionsRouter.get('/', async (req, res) => {
  const studentName = (req.query.studentName || '').trim();
  const matricule = (req.query.matricule || '').trim();
  if (!studentName && !matricule) {
    return res.status(400).json({ error: 'Paramètre studentName ou matricule requis' });
  }
  try {
    const pool = getPool();
    let resolvedName = studentName;
    if (matricule) {
      const byMatricule = await pool.query(
        `SELECT u.display_name
         FROM students s
         JOIN users u ON u.id = s.user_id
         WHERE s.matricule = $1 OR u.login_id = $1
         LIMIT 1`,
        [matricule]
      );
      if (byMatricule.rows.length) {
        resolvedName = byMatricule.rows[0].display_name || resolvedName;
      }
    }
    if (!resolvedName) {
      return res.status(400).json({ error: 'Étudiant introuvable' });
    }
    await ensureConventionsForStudent(pool, resolvedName);
    const result = await queryConventions(pool, {
      where: 'LOWER(student_name) = LOWER($1)',
      params: [resolvedName],
      orderBy: 'id DESC',
    });
    res.json({ conventions: mapConventionRows(result.rows) });
  } catch (err) {
    console.error('List conventions étudiant error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des conventions' });
  }
});

/**
 * GET /api/conventions/:conventionId/verify
 * Vérifie l'intégrité documentaire (SHA-256)
 */
conventionsRouter.get('/:conventionId/verify', async (req, res) => {
  const convId = parseInt(req.params.conventionId, 10);
  if (!convId || Number.isNaN(convId)) {
    return res.status(400).json({ error: 'Identifiant convention invalide' });
  }
  try {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM conventions WHERE id = $1', [convId]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Convention introuvable' });
    }
    const verification = verifyConventionIntegrity(result.rows[0]);
    res.json({
      conventionId: convId,
      reference: result.rows[0].reference,
      ...verification,
    });
  } catch (err) {
    console.error('Convention verify error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la vérification de la convention' });
  }
});

/**
 * GET /api/conventions/:conventionId
 * Détail d'une convention (convention signée depuis la base)
 */
conventionsRouter.get('/:conventionId', async (req, res) => {
  const convId = parseInt(req.params.conventionId, 10);
  if (!convId || Number.isNaN(convId)) {
    return res.status(400).json({ error: 'Identifiant convention invalide' });
  }
  try {
    const pool = getPool();
    const result = await queryConventions(pool, {
      where: 'id = $1',
      params: [convId],
      orderBy: 'id DESC',
    });
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Convention introuvable' });
    }
    res.json({ convention: mapConventionRow(result.rows[0]) });
  } catch (err) {
    console.error('Get convention error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement de la convention' });
  }
});

module.exports = { entreprisesRouter, demandesRouter, conventionsRouter };
