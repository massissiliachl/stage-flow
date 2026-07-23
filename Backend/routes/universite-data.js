const express = require('express');
const { getPool } = require('../lib/db');
const { queryConventions, mapConventionRows } = require('../lib/convention-query');

const router = express.Router();

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

    const convRes = await queryConventions(pool, {
      where: '1=1',
      params: [],
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
         WHERE u.role = 'etudiant'
         ORDER BY u.display_name ASC`
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
         WHERE u.role = 'etudiant'
         ORDER BY u.display_name ASC`
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
