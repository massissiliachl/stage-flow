const express = require('express');
const { getPool } = require('../lib/db');
const { verifyEmailToken, issueVerificationEmail } = require('../lib/email-verify');
const { hasEmailVerifyColumns } = require('../lib/email-verify-db');

const router = express.Router();

function roleToLoginPath(role) {
  if (role === 'entreprise') return 'entreprise.html';
  return 'etudiant.html';
}

router.get('/verify-email', async (req, res) => {
  const token = (req.query.token || '').trim();
  if (!token) {
    return res.status(400).json({ error: 'Token de vérification manquant' });
  }

  try {
    const pool = getPool();
    if (!(await hasEmailVerifyColumns(pool))) {
      return res.status(503).json({
        error: 'La vérification email n\'est pas encore activée sur le serveur',
        code: 'EMAIL_VERIFY_NOT_CONFIGURED',
      });
    }

    const result = await verifyEmailToken(pool, token);

    if (!result.ok) {
      return res.status(400).json({
        error: result.error,
        code: result.expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        email: result.email,
        role: result.role,
      });
    }

    res.json({
      message: result.alreadyVerified
        ? 'Votre email est déjà vérifié'
        : 'Adresse email vérifiée avec succès',
      alreadyVerified: !!result.alreadyVerified,
      email: result.email,
      role: result.role,
      loginPath: roleToLoginPath(result.role),
    });
  } catch (err) {
    console.error('Verify email error:', err.message);
    res.status(500).json({ error: 'Erreur lors de la vérification de l\'email' });
  }
});

router.post('/resend-verification', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const role = req.body?.role === 'entreprise' ? 'entreprise' : 'etudiant';

  if (!email) {
    return res.status(400).json({ error: 'Adresse email requise' });
  }

  const pool = getPool();
  if (!(await hasEmailVerifyColumns(pool))) {
    return res.json({
      message: 'La vérification email n\'est pas requise — vous pouvez vous connecter directement.',
      alreadyVerified: true,
    });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT id, email, display_name, role, email_verified
       FROM users
       WHERE email = $1 AND role = $2`,
      [email, role]
    );

    if (!result.rows.length) {
      return res.json({
        message: 'Si un compte existe avec cet email, un nouveau lien de vérification a été envoyé.',
      });
    }

    const user = result.rows[0];

    if (user.email_verified) {
      return res.json({
        message: 'Cette adresse email est déjà vérifiée. Vous pouvez vous connecter.',
        alreadyVerified: true,
      });
    }

    const mailResult = await issueVerificationEmail(client, {
      userId: user.id,
      email: user.email,
      name: user.display_name,
      role: user.role,
    });

    const payload = {
      message: 'Un nouvel email de vérification a été envoyé.',
    };

    if (mailResult.devMode && process.env.NODE_ENV !== 'production') {
      payload.devVerifyUrl = mailResult.verifyUrl;
    }

    res.json(payload);
  } catch (err) {
    console.error('Resend verification error:', err.message);
    res.status(500).json({ error: 'Impossible d\'envoyer l\'email de vérification' });
  } finally {
    client.release();
  }
});

module.exports = router;
