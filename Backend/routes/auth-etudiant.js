const express = require('express');
const { getPool } = require('../lib/db');
const { hashPassword, verifyPassword } = require('../lib/password');
const { issueVerificationEmail } = require('../lib/email-verify');

const router = express.Router();

function buildAvatar(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'ET';
}

function normalizeGroupMembers(groupType, members) {
  const list = Array.isArray(members) ? members : [];
  const cleaned = list
    .map((m) => ({
      name: (m.name || '').trim(),
      email: (m.email || '').trim().toLowerCase(),
      matricule: (m.matricule || '').trim(),
    }))
    .filter((m) => m.name);

  if (groupType === 'binome' && cleaned.length !== 1) {
    return { error: 'Un binôme nécessite exactement 1 coéquipier' };
  }
  if (groupType === 'quadrinome' && cleaned.length !== 3) {
    return { error: 'Un quadrinôme nécessite exactement 3 coéquipiers' };
  }
  if (groupType === 'solo' && cleaned.length) {
    return { error: 'Aucun coéquipier ne doit être renseigné pour un PFE individuel' };
  }

  return { members: cleaned };
}

function buildBinomePayload(groupType, members) {
  if (groupType === 'solo') return null;
  return {
    groupType,
    members: members.map((m) => ({
      ...m,
      avatar: buildAvatar(m.name),
    })),
  };
}

function toFrontendUser(row) {
  const studentData = row.student_data && typeof row.student_data === 'object' ? row.student_data : {};
  const binomeRaw = row.binome && typeof row.binome === 'object' ? row.binome : null;
  let groupType = studentData.groupType || 'solo';
  let groupMembers = [];

  if (binomeRaw && binomeRaw.groupType && Array.isArray(binomeRaw.members)) {
    groupType = binomeRaw.groupType;
    groupMembers = binomeRaw.members;
  } else if (binomeRaw && binomeRaw.name) {
    groupType = 'binome';
    groupMembers = [binomeRaw];
  }

  const binomeLegacy = groupMembers.length === 1 ? groupMembers[0] : (groupMembers[0] || null);

  return {
    id: row.user_id,
    name: row.display_name,
    email: row.email,
    matricule: row.matricule || studentData.matricule || row.login_id,
    specialty: row.specialty || studentData.specialty || '',
    promo: row.promotion || studentData.promo || '',
    university: studentData.university || 'Université Abderrahmane Mira — Béjaïa',
    faculte: row.faculte || studentData.faculte || '',
    departement: row.departement || studentData.departement || studentData.dept || '',
    dept: row.departement || studentData.departement || studentData.dept || '',
    theme: row.theme || studentData.theme || '',
    encadrant: row.encadrant || studentData.encadrant || '',
    avatar: row.avatar || buildAvatar(row.display_name),
    groupType,
    groupMembers,
    binome: binomeLegacy,
  };
}

router.get('/ping', (req, res) => {
  res.json({ ok: true, service: 'auth-etudiant' });
});

router.post('/register', async (req, res) => {
  const {
    name,
    email,
    matricule,
    password,
    specialty,
    promo,
    university,
    faculte,
    departement,
    encadrant,
    theme,
    groupType = 'solo',
    groupMembers = [],
  } = req.body || {};

  const nameTrim = (name || '').trim();
  const emailTrim = (email || '').trim().toLowerCase();
  const matriculeTrim = (matricule || '').trim();
  const normalizedGroupType = ['solo', 'binome', 'quadrinome'].includes(groupType) ? groupType : 'solo';
  const groupCheck = normalizeGroupMembers(normalizedGroupType, groupMembers);
  if (groupCheck.error) {
    return res.status(400).json({ error: groupCheck.error });
  }

  const encadrantTrim = (encadrant || '').trim();

  if (!nameTrim || !emailTrim || !matriculeTrim || !password || !encadrantTrim) {
    return res.status(400).json({
      error: 'Nom, email, matricule, encadrant universitaire et mot de passe sont obligatoires',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1 OR login_id = $2',
      [emailTrim, matriculeTrim]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email ou ce matricule' });
    }

    const existingMatricule = await client.query(
      'SELECT id FROM students WHERE matricule = $1',
      [matriculeTrim]
    );
    if (existingMatricule.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ce matricule est déjà utilisé' });
    }

    const studentData = {
      matricule: matriculeTrim,
      specialty: (specialty || '').trim(),
      promo: (promo || '').trim(),
      university: (university || 'Université Abderrahmane Mira — Béjaïa').trim(),
      faculte: (faculte || '').trim(),
      departement: (departement || '').trim(),
      encadrant: encadrantTrim,
      groupType: normalizedGroupType,
      theme: (theme || '').trim(),
    };
    const binomePayload = buildBinomePayload(normalizedGroupType, groupCheck.members);
    const passwordHash = hashPassword(password);
    const avatar = buildAvatar(nameTrim);

    const userResult = await client.query(
      `INSERT INTO users (
         email, login_id, password_hash, role, display_name, avatar,
         student_data, theme, encadrant, binome
       ) VALUES ($1, $2, $3, 'etudiant', $4, $5, $6::jsonb, $7, $8, $9::jsonb)
       RETURNING id, email, login_id, display_name, avatar, student_data, theme, encadrant, binome`,
      [
        emailTrim,
        matriculeTrim,
        passwordHash,
        nameTrim,
        avatar,
        JSON.stringify(studentData),
        studentData.theme || null,
        encadrantTrim,
        binomePayload ? JSON.stringify(binomePayload) : null,
      ]
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO students (user_id, matricule, specialty, promotion, theme, faculte, departement, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [
        user.id,
        matriculeTrim,
        studentData.specialty || null,
        studentData.promo || null,
        studentData.theme || null,
        studentData.faculte || null,
        studentData.departement || null,
      ]
    );

    const mailResult = await issueVerificationEmail(client, {
      userId: user.id,
      email: emailTrim,
      name: nameTrim,
      role: 'etudiant',
    });

    await client.query('COMMIT');

    const response = {
      message: 'Compte créé — vérifiez votre email pour vous connecter',
      requiresEmailVerification: true,
      email: emailTrim,
      matricule: matriculeTrim,
    };

    if (mailResult.devMode && process.env.NODE_ENV !== 'production') {
      response.devVerifyUrl = mailResult.verifyUrl;
    }

    res.status(201).json(response);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register etudiant error:', err.message);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email ou matricule déjà utilisé' });
    }
    res.status(500).json({ error: 'Erreur lors de la création du compte étudiant' });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  const matricule = (req.body?.matricule || req.body?.login_id || '').trim();
  const password = req.body?.password || '';

  if (!matricule || !password) {
    return res.status(400).json({ error: 'Matricule et mot de passe requis' });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.login_id,
         u.password_hash,
         u.display_name,
         u.avatar,
         u.student_data,
         u.theme,
         u.encadrant,
         u.binome,
         u.is_active,
         u.email_verified,
         s.matricule,
         s.specialty,
         s.promotion,
         s.faculte,
         s.departement
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.role = 'etudiant' AND (u.login_id = $1 OR s.matricule = $1)`,
      [matricule]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Matricule ou mot de passe incorrect' });
    }

    const row = result.rows[0];
    if (row.is_active === false) {
      return res.status(403).json({ error: 'Ce compte est désactivé' });
    }
    if (row.email_verified === false) {
      return res.status(403).json({
        error: 'Veuillez vérifier votre adresse email avant de vous connecter',
        code: 'EMAIL_NOT_VERIFIED',
        email: row.email,
        role: 'etudiant',
      });
    }
    if (!verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Matricule ou mot de passe incorrect' });
    }

    await pool.query(
      'UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [row.user_id]
    );

    res.json({
      message: 'Connexion réussie',
      user: toFrontendUser(row),
    });
  } catch (err) {
    console.error('Login etudiant error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

module.exports = router;
