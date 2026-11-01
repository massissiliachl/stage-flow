const express = require('express');
const { getPool } = require('../lib/db');
const { queryConventions, mapConventionRows } = require('../lib/convention-query');

const router = express.Router();

/** Filtre faculté / département selon le compte connecté (query). */
function scopeFiltersFromQuery(query) {
  const type = String(query.type || '').trim();
  const faculte = String(query.faculte || '').trim();
  const departement = String(query.departement || '').trim();
  const convParts = [];
  const convParams = [];
  const studentParts = [];
  const studentParams = [];
  let n = 1;

  if (type === 'departement' && departement) {
    convParts.push(`departement ILIKE $${n}`);
    convParams.push(`%${departement.replace(/[%_]/g, '')}%`);
    studentParts.push(`s.departement ILIKE $${n}`);
    studentParams.push(`%${departement.replace(/[%_]/g, '')}%`);
    n += 1;
  } else if (type === 'faculte' && faculte) {
    convParts.push(`faculte ILIKE $${n}`);
    convParams.push(`%${faculte.replace(/[%_]/g, '')}%`);
    studentParts.push(`s.faculte ILIKE $${n}`);
    studentParams.push(`%${faculte.replace(/[%_]/g, '')}%`);
    n += 1;
  }

  return {
    convWhere: convParts.length ? convParts.join(' AND ') : '1=1',
    convParams,
    studentAnd: studentParts.length ? ' AND ' + studentParts.join(' AND ') : '',
    studentParams,
  };
}

function mapStudentRow(row) {
  return {
    name: row.name || '',
    specialty: row.specialty || '',
    faculte: row.faculte || '',
    departement: row.departement || '',
    company: row.company || 'En recherche',
    status: row.status || 'pending',
    matricule: row.matricule || '',
    fromDb: true,
  };
}

/**
 * GET /api/universite/overview
 * Conventions + étudiants réels (PostgreSQL) pour les tableaux de bord université
 */
router.get('/overview', async (req, res) => {
  try {
    const pool = getPool();
    const scope = scopeFiltersFromQuery(req.query);

    const convRes = await queryConventions(pool, {
      where: scope.convWhere,
      params: scope.convParams,
      orderBy: 'id DESC',
    });

    let studentsRes;
    try {
      studentsRes = await pool.query(
        `SELECT
           COALESCE(u.display_name, s.matricule) AS name,
           s.matricule,
           s.specialty,
           s.faculte,
           s.departement,
           s.status,
           COALESCE(
             (SELECT c.entreprise_nom FROM conventions c
              WHERE c.student_name = u.display_name AND c.status != 'archived'
              ORDER BY c.id DESC LIMIT 1),
             (SELECT d.entreprise_nom FROM stage_demands d
              WHERE d.student_name = u.display_name AND d.status = 'accepted'
              ORDER BY d.id DESC LIMIT 1),
             'En recherche'
           ) AS company
         FROM students s
         JOIN users u ON u.id = s.user_id
         WHERE u.role = 'etudiant'${scope.studentAnd}
         ORDER BY u.display_name ASC`,
        scope.studentParams
      );
    } catch (err) {
      console.warn('Université students (requête étendue) — repli:', err.message);
      studentsRes = await pool.query(
        `SELECT
           u.display_name AS name,
           s.matricule,
           s.specialty,
           s.faculte,
           s.departement,
           s.status,
           'En recherche' AS company
         FROM students s
         JOIN users u ON u.id = s.user_id
         WHERE u.role = 'etudiant'${scope.studentAnd}
         ORDER BY u.display_name ASC`,
        scope.studentParams
      );
    }

    res.json({
      conventions: mapConventionRows(convRes.rows),
      students: studentsRes.rows.map(mapStudentRow),
    });
  } catch (err) {
    console.error('Université overview error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des données université' });
  }
});

module.exports = router;
