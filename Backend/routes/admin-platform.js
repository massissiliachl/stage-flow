const express = require('express');
const { getPool } = require('../lib/db');
const { requirePlatformAdmin } = require('../lib/admin-middleware');
const { hasAdminVerificationColumns } = require('../lib/admin-verification-db');

const router = express.Router();
router.use(requirePlatformAdmin);

async function logAudit(pool, adminId, action, entityType, entityId, details) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (admin_user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [adminId, action, entityType, String(entityId), JSON.stringify(details || {})]
    );
  } catch (err) {
    console.warn('admin audit:', err.message);
  }
}

router.get('/stats', async (req, res) => {
  try {
    const pool = getPool();
    const hasCols = await hasAdminVerificationColumns(pool);
    const stats = {
      entreprises: { total: 0, pending: 0, approved: 0, rejected: 0 },
      etudiants: { total: 0, pending: 0, approved: 0, rejected: 0 },
      adminVerificationEnabled: hasCols,
    };

    const ent = await pool.query('SELECT COUNT(*)::int AS c FROM entreprises');
    stats.entreprises.total = ent.rows[0]?.c || 0;

    const stu = await pool.query('SELECT COUNT(*)::int AS c FROM students');
    stats.etudiants.total = stu.rows[0]?.c || 0;

    if (hasCols) {
      const ep = await pool.query(
        `SELECT admin_verification_status AS s, COUNT(*)::int AS c
         FROM entreprises GROUP BY admin_verification_status`
      );
      ep.rows.forEach((r) => {
        if (r.s === 'pending') stats.entreprises.pending = r.c;
        else if (r.s === 'rejected') stats.entreprises.rejected = r.c;
        else stats.entreprises.approved += r.c;
      });
      const sp = await pool.query(
        `SELECT admin_verification_status AS s, COUNT(*)::int AS c
         FROM students GROUP BY admin_verification_status`
      );
      sp.rows.forEach((r) => {
        if (r.s === 'pending') stats.etudiants.pending = r.c;
        else if (r.s === 'rejected') stats.etudiants.rejected = r.c;
        else stats.etudiants.approved += r.c;
      });
    }

    res.json(stats);
  } catch (err) {
    console.error('GET /admin/stats:', err.message);
    res.status(500).json({ error: 'Impossible de charger les statistiques' });
  }
});

router.get('/entreprises', async (req, res) => {
  const status = (req.query.status || '').trim();
  const q = (req.query.q || '').trim();
  try {
    const pool = getPool();
    const hasCols = await hasAdminVerificationColumns(pool);
    const params = [];
    const where = [];

    if (hasCols && status) {
      params.push(status);
      where.push(`e.admin_verification_status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      where.push(`(e.nom ILIKE $${i} OR e.nif ILIKE $${i} OR e.identifiant ILIKE $${i})`);
    }

    const sql = `
      SELECT
        e.id, e.nom, e.secteur, e.wilaya, e.nif, e.nrc, e.nis, e.identifiant,
        e.email_contact, e.phone, e.is_active, e.created_at,
        ${hasCols ? 'e.admin_verification_status, e.nif_verified, e.nis_verified, e.nrc_verified, e.admin_notes, e.admin_rejection_reason,' : ''}
        u.id AS user_id, u.email AS user_email, u.is_active AS user_active
      FROM entreprises e
      LEFT JOIN users u ON u.entreprise_id = e.id AND u.role = 'entreprise'
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY e.created_at DESC
      LIMIT 200`;
    const result = await pool.query(sql, params);
    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /admin/entreprises:', err.message);
    res.status(500).json({ error: 'Erreur liste entreprises' });
  }
});

router.patch('/entreprises/:id/verification', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID invalide' });

  const {
    status,
    nifVerified,
    nisVerified,
    nrcVerified,
    notes,
    rejectionReason,
  } = req.body || {};

  const allowed = ['pending', 'approved', 'rejected'];
  const newStatus = allowed.includes(status) ? status : null;

  try {
    const pool = getPool();
    if (!(await hasAdminVerificationColumns(pool))) {
      return res.status(503).json({ error: 'Migration admin non appliquée sur la base' });
    }

    const cur = await pool.query('SELECT id, nom FROM entreprises WHERE id = $1', [id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Entreprise introuvable' });

    const fields = [];
    const params = [];
    function add(col, val) {
      params.push(val);
      fields.push(`${col} = $${params.length}`);
    }

    if (newStatus) add('admin_verification_status', newStatus);
    if (typeof nifVerified === 'boolean') add('nif_verified', nifVerified);
    if (typeof nisVerified === 'boolean') add('nis_verified', nisVerified);
    if (typeof nrcVerified === 'boolean') add('nrc_verified', nrcVerified);
    if (notes !== undefined) add('admin_notes', (notes || '').trim() || null);
    if (rejectionReason !== undefined) {
      add('admin_rejection_reason', (rejectionReason || '').trim() || null);
    }

    if (newStatus === 'approved' || newStatus === 'rejected') {
      add('admin_verified_at', new Date());
      add('admin_verified_by', req.adminUser.id);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'Aucune modification demandée' });
    }

    params.push(id);
    await pool.query(
      `UPDATE entreprises SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
      params
    );

    if (newStatus === 'approved') {
      await pool.query(
        `UPDATE users SET is_active = TRUE, updated_at = NOW()
         WHERE entreprise_id = $1 AND role = 'entreprise'`,
        [id]
      );
    }
    if (newStatus === 'rejected') {
      await pool.query(
        `UPDATE users SET is_active = FALSE, updated_at = NOW()
         WHERE entreprise_id = $1 AND role = 'entreprise'`,
        [id]
      );
    }

    await logAudit(pool, req.adminUser.id, 'entreprise_verification', 'entreprise', id, {
      status: newStatus,
      nifVerified,
      nisVerified,
      nrcVerified,
    });

    const row = await pool.query(
      `SELECT id, nom, admin_verification_status, nif_verified, nis_verified, nrc_verified,
              admin_notes, admin_rejection_reason, admin_verified_at
       FROM entreprises WHERE id = $1`,
      [id]
    );
    res.json({ message: 'Entreprise mise à jour', entreprise: row.rows[0] });
  } catch (err) {
    console.error('PATCH entreprise verification:', err.message);
    res.status(500).json({ error: 'Erreur mise à jour entreprise' });
  }
});

router.get('/etudiants', async (req, res) => {
  const status = (req.query.status || '').trim();
  const q = (req.query.q || '').trim();
  try {
    const pool = getPool();
    const hasCols = await hasAdminVerificationColumns(pool);
    const params = [];
    const where = [];

    if (hasCols && status) {
      params.push(status);
      where.push(`s.admin_verification_status = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      where.push(`(s.matricule ILIKE $${i} OR u.display_name ILIKE $${i} OR u.email ILIKE $${i})`);
    }

    const sql = `
      SELECT
        s.id, s.matricule, s.specialty, s.promotion, s.faculte, s.departement, s.status AS stage_status,
        s.created_at,
        ${hasCols ? 's.matricule_verified, s.admin_verification_status, s.admin_notes, s.admin_rejection_reason,' : ''}
        u.id AS user_id, u.email, u.display_name, u.is_active
      FROM students s
      JOIN users u ON u.id = s.user_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY s.created_at DESC
      LIMIT 200`;
    const result = await pool.query(sql, params);
    res.json({ items: result.rows });
  } catch (err) {
    console.error('GET /admin/etudiants:', err.message);
    res.status(500).json({ error: 'Erreur liste étudiants' });
  }
});

router.patch('/etudiants/:id/verification', async (req, res) => {
  const studentId = req.params.id;
  const {
    status,
    matriculeVerified,
    notes,
    rejectionReason,
  } = req.body || {};

  const allowed = ['pending', 'approved', 'rejected'];
  const newStatus = allowed.includes(status) ? status : null;

  try {
    const pool = getPool();
    if (!(await hasAdminVerificationColumns(pool))) {
      return res.status(503).json({ error: 'Migration admin non appliquée sur la base' });
    }

    const cur = await pool.query(
      `SELECT s.id, s.user_id, s.matricule FROM students s WHERE s.id = $1`,
      [studentId]
    );
    if (!cur.rows.length) return res.status(404).json({ error: 'Étudiant introuvable' });

    const userId = cur.rows[0].user_id;
    const fields = [];
    const params = [];
    function add(col, val) {
      params.push(val);
      fields.push(`${col} = $${params.length}`);
    }

    if (newStatus) add('admin_verification_status', newStatus);
    if (typeof matriculeVerified === 'boolean') add('matricule_verified', matriculeVerified);
    if (notes !== undefined) add('admin_notes', (notes || '').trim() || null);
    if (rejectionReason !== undefined) {
      add('admin_rejection_reason', (rejectionReason || '').trim() || null);
    }
    if (newStatus === 'approved') add('status', 'active');
    if (newStatus === 'rejected') add('status', 'rejected');

    if (newStatus === 'approved' || newStatus === 'rejected') {
      add('admin_verified_at', new Date());
      add('admin_verified_by', req.adminUser.id);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'Aucune modification demandée' });
    }

    params.push(studentId);
    await pool.query(
      `UPDATE students SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`,
      params
    );

    if (newStatus === 'approved') {
      await pool.query(
        'UPDATE users SET is_active = TRUE, updated_at = NOW() WHERE id = $1',
        [userId]
      );
    }
    if (newStatus === 'rejected') {
      await pool.query(
        'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
        [userId]
      );
    }

    await logAudit(pool, req.adminUser.id, 'student_verification', 'student', studentId, {
      status: newStatus,
      matriculeVerified,
    });

    const row = await pool.query(
      `SELECT s.id, s.matricule, s.matricule_verified, s.admin_verification_status,
              s.admin_notes, s.admin_rejection_reason, s.status
       FROM students s WHERE s.id = $1`,
      [studentId]
    );
    res.json({ message: 'Étudiant mis à jour', student: row.rows[0] });
  } catch (err) {
    console.error('PATCH student verification:', err.message);
    res.status(500).json({ error: 'Erreur mise à jour étudiant' });
  }
});

router.get('/audit', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
              u.email AS admin_email
       FROM admin_audit_log a
       LEFT JOIN users u ON u.id = a.admin_user_id
       ORDER BY a.created_at DESC
       LIMIT 100`
    );
    res.json({ items: result.rows });
  } catch (err) {
    if (err.message.includes('admin_audit_log')) {
      return res.json({ items: [] });
    }
    res.status(500).json({ error: 'Erreur journal audit' });
  }
});

module.exports = router;
