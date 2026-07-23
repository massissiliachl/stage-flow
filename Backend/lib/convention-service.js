const { mapConventionRow, buildPartiesSnapshot, parseSignaturesJson } = require('./convention-map');
const { computeDocumentHash, computeFinalIntegrityHash, HASH_ALGORITHM } = require('./convention-hash');
const { computeStageDates } = require('./stage-dates');

async function updateConventionRow(client, row, payload) {
  const {
    signaturesJson,
    theme,
    faculte,
    departement,
    periode,
    dateDebut,
    dateFin,
    documentHash,
  } = payload;

  try {
    const upd = await client.query(
      `UPDATE conventions SET
         signatures = $2::jsonb,
         theme = $3,
         faculte = $4,
         departement = $5,
         periode = $6,
         date_debut = $7,
         date_fin = $8,
         document_hash = $9,
         hash_algorithm = $10,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        row.id,
        signaturesJson,
        theme,
        faculte,
        departement,
        periode,
        dateDebut,
        dateFin,
        documentHash,
        HASH_ALGORITHM,
      ]
    );
    return upd.rows[0];
  } catch (err) {
    console.warn('Convention update (schéma étendu) — repli:', err.message);
    const upd = await client.query(
      `UPDATE conventions SET
         signatures = $2::jsonb,
         theme = $3,
         faculte = $4,
         departement = $5,
         periode = $6,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [row.id, signaturesJson, theme, faculte, departement, periode]
    );
    return upd.rows[0];
  }
}

async function insertConventionRow(client, payload) {
  const {
    reference,
    studentId,
    studentName,
    entrepriseId,
    entrepriseNom,
    theme,
    periode,
    faculte,
    departement,
    signaturesPayload,
    documentHash,
    dateDebut,
    dateFin,
  } = payload;

  try {
    const convRes = await client.query(
      `INSERT INTO conventions (
         reference, student_id, student_name, entreprise_id, entreprise_nom,
         theme, periode, status, faculte, departement, is_generated, signatures,
         document_hash, hash_algorithm, date_debut, date_fin
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, TRUE, $10::jsonb, $11, $12, $13, $14)
       RETURNING *`,
      [
        reference,
        studentId,
        studentName,
        entrepriseId,
        entrepriseNom,
        theme,
        periode,
        faculte,
        departement,
        signaturesPayload,
        documentHash,
        HASH_ALGORITHM,
        dateDebut,
        dateFin,
      ]
    );
    return convRes.rows[0];
  } catch (err) {
    console.warn('Convention insert (schéma étendu) — repli:', err.message);
    const convRes = await client.query(
      `INSERT INTO conventions (
         reference, student_id, student_name, entreprise_id, entreprise_nom,
         theme, periode, status, faculte, departement, is_generated, signatures
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, TRUE, $10::jsonb)
       RETURNING *`,
      [
        reference,
        studentId,
        studentName,
        entrepriseId,
        entrepriseNom,
        theme,
        periode,
        faculte,
        departement,
        signaturesPayload,
      ]
    );
    return convRes.rows[0];
  }
}

function resolveConventionPeriode(demand, parties) {
  const duree = (demand.duree || parties?.student?.duree || '').trim();
  return duree || '2 mois';
}

async function nextConventionReference(client) {
  const year = new Date().getFullYear();
  const result = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM conventions');
  const num = Number(result.rows[0].n) + 46;
  return `SF-${year}-${String(num).padStart(3, '0')}`;
}

async function resolveEncadrant(client, demand, encadrant) {
  let enc = (encadrant || demand.encadrant || '').trim();
  if (enc && enc !== '—') return enc;
  const encRes = await client.query(
    `SELECT encadrant_ent FROM users WHERE entreprise_id = $1 AND role = 'entreprise' LIMIT 1`,
    [demand.entreprise_id]
  );
  return encRes.rows[0]?.encadrant_ent || '—';
}

/**
 * Crée ou met à jour la convention liée à une demande acceptée.
 */
async function createOrUpdateConventionForDemand(client, demand, encadrant) {
  const enc = await resolveEncadrant(client, demand, encadrant);
  const parties = await buildPartiesSnapshot(client, demand, enc);
  const periode = resolveConventionPeriode(demand, parties);
  const { dateDebut, dateFin } = computeStageDates(demand.duree || periode);

  const existingConv = await client.query(
    `SELECT * FROM conventions
     WHERE entreprise_id = $1 AND student_name = $2 AND status != 'archived'
     ORDER BY id DESC LIMIT 1`,
    [demand.entreprise_id, demand.student_name]
  );

  if (existingConv.rows.length) {
    const row = existingConv.rows[0];
    const sig = parseSignaturesJson(row.signatures);
    sig.parties = parties;
    const documentHash = computeDocumentHash({ ...row, signatures: sig }, sig);
    const updatedRow = await updateConventionRow(client, row, {
      signaturesJson: JSON.stringify(sig),
      theme: demand.theme,
      faculte: parties.student.faculte || demand.faculte,
      departement: parties.student.departement || demand.departement,
      periode,
      dateDebut,
      dateFin,
      documentHash,
    });
    return mapConventionRow(updatedRow);
  }

  const signaturesPayload = JSON.stringify({ parties });
  const reference = await nextConventionReference(client);
  const draftRow = {
    reference,
    student_name: demand.student_name,
    entreprise_nom: demand.entreprise_nom,
    entreprise_id: demand.entreprise_id,
    theme: demand.theme,
    periode,
    faculte: parties.student.faculte || demand.faculte,
    departement: parties.student.departement || demand.departement,
    signatures: { parties },
  };
  const documentHash = computeDocumentHash(draftRow, { parties });
  const insertedRow = await insertConventionRow(client, {
    reference,
    studentId: demand.student_id,
    studentName: demand.student_name,
    entrepriseId: demand.entreprise_id,
    entrepriseNom: demand.entreprise_nom,
    theme: demand.theme,
    periode,
    faculte: parties.student.faculte || demand.faculte,
    departement: parties.student.departement || demand.departement,
    signaturesPayload,
    documentHash,
    dateDebut,
    dateFin,
  });
  return mapConventionRow(insertedRow);
}

/**
 * Génère les conventions manquantes pour les demandes déjà acceptées (rattrapage).
 */
async function ensureConventionsForStudent(pool, studentName) {
  const missing = await pool.query(
    `SELECT d.* FROM stage_demands d
     WHERE d.student_name = $1 AND d.status = 'accepted'
       AND NOT EXISTS (
         SELECT 1 FROM conventions c
         WHERE c.entreprise_id = d.entreprise_id
           AND c.student_name = d.student_name
           AND c.status != 'archived'
       )
     ORDER BY d.id ASC`,
    [studentName]
  );

  if (!missing.rows.length) return [];

  const client = await pool.connect();
  const created = [];
  try {
    await client.query('BEGIN');
    for (const demand of missing.rows) {
      created.push(await createOrUpdateConventionForDemand(client, demand));
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return created;
}

module.exports = {
  resolveConventionPeriode,
  nextConventionReference,
  createOrUpdateConventionForDemand,
  ensureConventionsForStudent,
};
