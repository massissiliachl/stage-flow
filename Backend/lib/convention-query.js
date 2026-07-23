const { mapConventionRow } = require('./convention-map');
const { HASH_ALGORITHM } = require('./convention-hash');

const EXTENDED_COLS = `id, reference, student_name, entreprise_id, entreprise_nom, theme, periode, status,
  signed_etudiant, signed_entreprise, signed_universite, faculte, departement, signatures,
  document_hash, final_integrity_hash, hash_algorithm, date_debut, date_fin`;

const BASIC_COLS = `id, reference, student_name, entreprise_id, entreprise_nom, theme, periode, status,
  signed_etudiant, signed_entreprise, signed_universite, faculte, departement, signatures`;

async function queryConventions(pool, { where, params, orderBy = 'id DESC' }) {
  try {
    return await pool.query(
      `SELECT ${EXTENDED_COLS} FROM conventions WHERE ${where} ORDER BY ${orderBy}`,
      params
    );
  } catch (err) {
    console.warn('Conventions query (schéma étendu) — repli:', err.message);
    return pool.query(
      `SELECT ${BASIC_COLS} FROM conventions WHERE ${where} ORDER BY ${orderBy}`,
      params
    );
  }
}

async function updateConventionSign(pool, payload) {
  const {
    convId,
    sigJson,
    signedEtudiant,
    signedEntreprise,
    signedUniversite,
    status,
    documentHash,
    finalIntegrityHash,
  } = payload;

  const attempts = [
    {
      name: 'schéma étendu',
      sql: `UPDATE conventions SET
              signatures = $2::jsonb,
              signed_etudiant = $3,
              signed_entreprise = $4,
              signed_universite = $5,
              status = $6,
              document_hash = $7,
              final_integrity_hash = $8,
              hash_algorithm = $9,
              updated_at = NOW()
            WHERE id = $1
            RETURNING *`,
      params: [
        convId,
        sigJson,
        signedEtudiant,
        signedEntreprise,
        signedUniversite,
        status,
        documentHash,
        finalIntegrityHash,
        HASH_ALGORITHM,
      ],
    },
    {
      name: 'schéma minimal',
      sql: `UPDATE conventions SET
              signatures = $2::jsonb,
              signed_etudiant = $3,
              signed_entreprise = $4,
              signed_universite = $5,
              status = $6,
              updated_at = NOW()
            WHERE id = $1
            RETURNING *`,
      params: [
        convId,
        sigJson,
        signedEtudiant,
        signedEntreprise,
        signedUniversite,
        status,
      ],
    },
  ];

  let lastErr;
  for (const attempt of attempts) {
    try {
      return await pool.query(attempt.sql, attempt.params);
    } catch (err) {
      lastErr = err;
      console.warn(`Convention sign (${attempt.name}) — échec:`, err.message);
    }
  }
  throw lastErr || new Error('Mise à jour signature impossible');
}

function mapConventionRows(rows) {
  return rows.map(mapConventionRow);
}

module.exports = {
  queryConventions,
  updateConventionSign,
  mapConventionRows,
};
