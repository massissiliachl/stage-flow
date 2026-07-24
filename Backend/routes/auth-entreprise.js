const express = require('express');
const { getPool } = require('../lib/db');
const { hashPassword, verifyPassword } = require('../lib/password');
const { issueVerificationEmail } = require('../lib/email-verify');
const { hasEmailVerifyColumns } = require('../lib/email-verify-db');
const { sanitizeEntrepriseLogoImage } = require('../lib/entreprise-logo');

const router = express.Router();

function buildIdentifiant(nom) {
  return nom.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 32);
}

function normalizeNif(value) {
  return (value || '').replace(/\D/g, '');
}

function normalizeNrc(value) {
  return (value || '').trim().toUpperCase();
}

function toFrontendUser(row) {
  const logo = row.entreprise_logo || {};
  const logoUrl = logo.imageDataUrl || logo.pngUrl || '';
  return {
    id: row.user_id,
    entrepriseId: row.entreprise_id,
    name: row.display_name || 'Direction RH',
    company: row.entreprise_nom,
    sector: row.secteur || 'À définir',
    wilaya: row.wilaya || '',
    adresse: row.adresse || logo.adresse || '',
    phone: row.phone || '',
    email: row.email || row.email_contact || '',
    nif: row.nif || '',
    nrc: row.nrc || '',
    nis: row.nis || '',
    identifiant: row.login_id,
    avatar: row.avatar || (row.entreprise_nom || '').slice(0, 2).toUpperCase(),
    encadrant_stage: row.encadrant_ent || logo.encadrant_stage || '',
    logoUrl,
  };
}

/**
 * GET /api/auth/entreprise/ping
 */
router.get('/ping', (req, res) => {
  res.json({ ok: true, service: 'auth-entreprise' });
});

/**
 * POST /api/auth/entreprise/register
 */
router.post('/register', async (req, res) => {
  const {
    nom,
    secteur,
    wilaya,
    adresse,
    phone,
    email,
    encadrant,
    password,
    nif,
    nrc,
    nis,
    logoImage,
  } = req.body || {};

  const nomTrim = (nom || '').trim();
  const emailTrim = (email || '').trim().toLowerCase();
  const nifNorm = normalizeNif(nif);
  const nrcNorm = normalizeNrc(nrc);
  const nisNorm = (nis || '').trim();
  const phoneTrim = (phone || '').trim();
  const adresseTrim = (adresse || '').trim();
  const identifiant = buildIdentifiant(nomTrim);

  const missing = [];
  if (!nomTrim) missing.push('raison sociale');
  if (!nifNorm) missing.push('NIF');
  if (!nrcNorm) missing.push('N° registre de commerce');
  if (!adresseTrim) missing.push('adresse');
  if (!phoneTrim) missing.push('téléphone');
  if (!emailTrim) missing.push('email');
  if (!password) missing.push('mot de passe');

  if (missing.length) {
    return res.status(400).json({
      error: `Champs obligatoires manquants : ${missing.join(', ')}`,
    });
  }

  if (nifNorm.length < 15 || nifNorm.length > 20) {
    return res.status(400).json({
      error: 'Le NIF doit contenir entre 15 et 20 chiffres',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Le mot de passe doit contenir au moins 6 caractères',
    });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingLogin = await client.query(
      'SELECT id FROM users WHERE login_id = $1 OR email = $2',
      [identifiant, emailTrim]
    );
    if (existingLogin.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Un compte existe déjà avec cet email ou cet identifiant entreprise',
        identifiant,
      });
    }

    const existingEnt = await client.query(
      `SELECT id, nom FROM entreprises
       WHERE identifiant = $1 OR nom ILIKE $2 OR nif = $3 OR nrc = $4`,
      [identifiant, nomTrim, nifNorm, nrcNorm]
    );
    if (existingEnt.rows.length) {
      await client.query('ROLLBACK');
      const row = existingEnt.rows[0];
      let detail = 'Cette entreprise est déjà inscrite';
      if (row.nom?.toLowerCase() === nomTrim.toLowerCase()) {
        detail = 'Cette raison sociale est déjà inscrite';
      }
      return res.status(409).json({ error: detail, identifiant });
    }

    const logoImageSafe = sanitizeEntrepriseLogoImage(logoImage);
    if (logoImage && !logoImageSafe) {
      return res.status(400).json({
        error: 'Logo invalide : utilisez une image PNG, JPEG ou WebP (max 512 Ko)',
      });
    }

    const logo = {};
    if (encadrant) logo.encadrant_stage = encadrant.trim();
    if (logoImageSafe) logo.imageDataUrl = logoImageSafe;

    const entrepriseResult = await client.query(
      `INSERT INTO entreprises (
         nom, domaine, secteur, wilaya, adresse, phone, email_contact,
         nif, nrc, nis, identifiant, logo, offres
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
       RETURNING id, nom, secteur, wilaya, adresse, phone, email_contact, nif, nrc, nis, identifiant`,
      [
        nomTrim,
        'Commerce & Distribution',
        (secteur || 'À définir').trim(),
        (wilaya || 'Béjaïa').trim(),
        adresseTrim,
        phoneTrim,
        emailTrim,
        nifNorm,
        nrcNorm,
        nisNorm || null,
        identifiant,
        Object.keys(logo).length ? JSON.stringify(logo) : null,
      ]
    );

    const entreprise = entrepriseResult.rows[0];
    const passwordHash = hashPassword(password);
    const avatar = nomTrim.slice(0, 2).toUpperCase();

    const userResult = await client.query(
      `INSERT INTO users (
         email, login_id, password_hash, role, display_name, avatar,
         entreprise_id, encadrant_ent, phone
       ) VALUES ($1, $2, $3, 'entreprise', $4, $5, $6, $7, $8)
       RETURNING id, email, login_id, display_name, avatar, encadrant_ent, phone`,
      [
        emailTrim,
        identifiant,
        passwordHash,
        'Direction RH',
        avatar,
        entreprise.id,
        (encadrant || '').trim() || null,
        phoneTrim,
      ]
    );

    const user = userResult.rows[0];

    const mailResult = await issueVerificationEmail(client, {
      userId: user.id,
      email: emailTrim,
      name: nomTrim,
      role: 'entreprise',
    });

    await client.query('COMMIT');

    const verifyEnabled = !mailResult.skipped;

    if (!verifyEnabled) {
      return res.status(201).json({
        message: 'Compte entreprise créé avec succès',
        identifiant,
        user: toFrontendUser({
          user_id: user.id,
          email: user.email,
          login_id: user.login_id,
          display_name: user.display_name,
          avatar: user.avatar,
          encadrant_ent: user.encadrant_ent,
          phone: user.phone,
          entreprise_id: entreprise.id,
          entreprise_nom: entreprise.nom,
          secteur: entreprise.secteur,
          wilaya: entreprise.wilaya,
          adresse: entreprise.adresse,
          email_contact: entreprise.email_contact,
          nif: entreprise.nif,
          nrc: entreprise.nrc,
          nis: entreprise.nis,
          entreprise_logo: logo,
        }),
      });
    }

    const response = {
      message: 'Compte créé — vérifiez votre email pour vous connecter',
      requiresEmailVerification: true,
      email: emailTrim,
      identifiant,
    };

    if (mailResult.devMode && process.env.NODE_ENV !== 'production') {
      response.devVerifyUrl = mailResult.verifyUrl;
    }

    res.status(201).json(response);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register entreprise error:', err.message);
    if (err.code === '23505') {
      return res.status(409).json({
        error: 'NIF, NRC ou email déjà utilisé par une autre entreprise',
      });
    }
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/entreprise/login
 */
router.post('/login', async (req, res) => {
  const loginId = ((req.body?.identifiant || req.body?.login_id || '') + '').trim().toUpperCase();
  const password = req.body?.password || '';

  if (!loginId || !password) {
    return res.status(400).json({
      error: 'Identifiant et mot de passe requis',
    });
  }

  try {
    const pool = getPool();
    const verifyEnabled = await hasEmailVerifyColumns(pool);
    const emailVerifiedSelect = verifyEnabled ? 'u.email_verified,' : 'TRUE AS email_verified,';

    const result = await pool.query(
      `SELECT
         u.id AS user_id,
         u.email,
         u.login_id,
         u.password_hash,
         u.display_name,
         u.avatar,
         u.encadrant_ent,
         u.phone,
         u.is_active,
         ${emailVerifiedSelect}
         e.id AS entreprise_id,
         e.nom AS entreprise_nom,
         e.secteur,
         e.wilaya,
         e.adresse,
         e.email_contact,
         e.nif,
         e.nrc,
         e.nis,
         e.logo AS entreprise_logo
       FROM users u
       JOIN entreprises e ON e.id = u.entreprise_id
       WHERE u.login_id = $1 AND u.role = 'entreprise'`,
      [loginId]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }

    const row = result.rows[0];

    if (row.is_active === false) {
      return res.status(403).json({ error: 'Ce compte est désactivé' });
    }

    if (row.email_verified === false && verifyEnabled) {
      return res.status(403).json({
        error: 'Veuillez vérifier votre adresse email avant de vous connecter',
        code: 'EMAIL_NOT_VERIFIED',
        email: row.email,
        role: 'entreprise',
        identifiant: row.login_id,
      });
    }

    if (!verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
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
    console.error('Login entreprise error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

module.exports = router;
