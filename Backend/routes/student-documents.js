const express = require('express');
const { getPool } = require('../lib/db');

const router = express.Router();

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const CATEGORY_LABELS = {
  cv: 'Curriculum Vitae',
  motivation: 'Lettre de motivation',
  notes: 'Relevé de notes',
  inscription: 'Attestation inscription',
  other: 'Autre document',
};

function normalizeMatricule(value) {
  return String(value || '').trim().replace(/[\s\u00A0\u202F\u2007]/g, '');
}

function mapDocSummary(doc) {
  if (!doc || !doc.id) return null;
  return {
    id: doc.id,
    category: doc.category || 'other',
    label: doc.label || CATEGORY_LABELS[doc.category] || 'Document',
    fileName: doc.fileName || 'document.pdf',
    mimeType: doc.mimeType || 'application/pdf',
    size: Number(doc.size) || 0,
    uploadedAt: doc.uploadedAt || null,
    status: 'active',
  };
}

async function resolveStudentRow(pool, { matricule, studentName }) {
  const m = normalizeMatricule(matricule);
  if (m) {
    const byMat = await pool.query(
      `SELECT s.user_id, s.matricule, s.profile_documents, u.display_name AS student_name
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE u.login_id = $1
          OR s.matricule = $1
          OR regexp_replace(s.matricule, '[[:space:]]+', '', 'g') = $1
       LIMIT 1`,
      [m]
    );
    if (byMat.rows[0]) return byMat.rows[0];
  }
  const nameTrim = String(studentName || '').trim();
  if (nameTrim) {
    const byName = await pool.query(
      `SELECT s.user_id, s.matricule, s.profile_documents, u.display_name AS student_name
       FROM students s
       JOIN users u ON u.id = s.user_id
       WHERE lower(trim(u.display_name)) = lower($1)
       LIMIT 1`,
      [nameTrim]
    );
    if (byName.rows[0]) return byName.rows[0];
  }
  return null;
}

function parseDocuments(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/** GET /api/etudiant/documents?matricule=&studentName= */
router.get('/', async (req, res) => {
  const matricule = req.query.matricule;
  const studentName = req.query.studentName;
  if (!normalizeMatricule(matricule) && !String(studentName || '').trim()) {
    return res.status(400).json({ error: 'Paramètre matricule ou studentName requis' });
  }
  try {
    const pool = getPool();
    const row = await resolveStudentRow(pool, { matricule, studentName });
    if (!row) {
      return res.json({ documents: [], matricule: normalizeMatricule(matricule) || null });
    }
    const docs = parseDocuments(row.profile_documents).map(mapDocSummary).filter(Boolean);
    res.json({ documents: docs, matricule: row.matricule, studentName: row.student_name });
  } catch (err) {
    console.error('List student documents error:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement des documents' });
  }
});

/** GET /api/etudiant/documents/:docId?matricule=&studentName= */
router.get('/:docId', async (req, res) => {
  const docId = String(req.params.docId || '').trim();
  if (!docId) return res.status(400).json({ error: 'Document invalide' });
  try {
    const pool = getPool();
    const row = await resolveStudentRow(pool, {
      matricule: req.query.matricule,
      studentName: req.query.studentName,
    });
    if (!row) return res.status(404).json({ error: 'Étudiant introuvable' });
    const doc = parseDocuments(row.profile_documents).find((d) => d.id === docId);
    if (!doc) return res.status(404).json({ error: 'Document introuvable' });
    res.json({
      document: {
        ...mapDocSummary(doc),
        dataBase64: doc.dataBase64 || null,
      },
    });
  } catch (err) {
    console.error('Get student document error:', err.message);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

/** POST /api/etudiant/documents */
router.post('/', async (req, res) => {
  const {
    matricule,
    studentName,
    category,
    label,
    fileName,
    mimeType,
    dataBase64,
  } = req.body || {};

  const cat = String(category || 'other').trim().toLowerCase();
  if (!CATEGORY_LABELS[cat] && cat !== 'other') {
    return res.status(400).json({ error: 'Type de document invalide' });
  }

  const base64 = String(dataBase64 || '').replace(/^data:[^;]+;base64,/, '').trim();
  if (!base64) {
    return res.status(400).json({ error: 'Fichier vide ou illisible' });
  }

  let sizeBytes;
  try {
    sizeBytes = Buffer.from(base64, 'base64').length;
  } catch (_) {
    return res.status(400).json({ error: 'Encodage du fichier invalide' });
  }
  if (sizeBytes > MAX_FILE_BYTES) {
    return res.status(400).json({ error: 'Fichier trop volumineux (max 4 Mo)' });
  }

  const mime = String(mimeType || 'application/pdf').trim().toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return res.status(400).json({ error: 'Format non autorisé (PDF, JPEG, PNG, WebP)' });
  }

  const safeName = String(fileName || 'document.pdf').trim().slice(0, 180) || 'document.pdf';
  const docLabel = String(label || '').trim() || CATEGORY_LABELS[cat] || 'Document';

  try {
    const pool = getPool();
    const row = await resolveStudentRow(pool, { matricule, studentName });
    if (!row) {
      return res.status(404).json({ error: 'Étudiant introuvable — reconnectez-vous avec votre matricule' });
    }

    const docs = parseDocuments(row.profile_documents);
    const newDoc = {
      id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      category: cat,
      label: docLabel,
      fileName: safeName,
      mimeType: mime,
      size: sizeBytes,
      dataBase64: base64,
      uploadedAt: new Date().toISOString(),
    };

    const withoutSameCategory = cat === 'other'
      ? docs
      : docs.filter((d) => (d.category || 'other') !== cat);
    const next = [...withoutSameCategory, newDoc];

    await pool.query(
      `UPDATE students SET profile_documents = $1::jsonb, updated_at = NOW() WHERE user_id = $2`,
      [JSON.stringify(next), row.user_id]
    );

    res.status(201).json({ document: mapDocSummary(newDoc), documents: next.map(mapDocSummary).filter(Boolean) });
  } catch (err) {
    console.error('Upload student document error:', err.message);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement du document' });
  }
});

/** DELETE /api/etudiant/documents/:docId */
router.delete('/:docId', async (req, res) => {
  const docId = String(req.params.docId || '').trim();
  const { matricule, studentName } = req.body || {};
  if (!docId) return res.status(400).json({ error: 'Document invalide' });

  try {
    const pool = getPool();
    const row = await resolveStudentRow(pool, { matricule, studentName });
    if (!row) return res.status(404).json({ error: 'Étudiant introuvable' });

    const docs = parseDocuments(row.profile_documents);
    const next = docs.filter((d) => d.id !== docId);
    if (next.length === docs.length) {
      return res.status(404).json({ error: 'Document introuvable' });
    }

    await pool.query(
      `UPDATE students SET profile_documents = $1::jsonb, updated_at = NOW() WHERE user_id = $2`,
      [JSON.stringify(next), row.user_id]
    );

    res.json({ ok: true, documents: next.map(mapDocSummary).filter(Boolean) });
  } catch (err) {
    console.error('Delete student document error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = { studentDocumentsRouter: router, CATEGORY_LABELS };
