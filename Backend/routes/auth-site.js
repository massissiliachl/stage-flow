const express = require('express');
const { rateLimit } = require('../lib/rate-limit');

const router = express.Router();
const gateLimiter = rateLimit({ max: 20, keyPrefix: 'site-gate' });

router.get('/status', (req, res) => {
  const expected = process.env.STAGEFLOW_ACCESS_PASSWORD;
  res.json({ enabled: Boolean(expected) });
});

/** Vérifie le mot de passe d'accès au site (optionnel, défini sur Render). */
router.post('/check', gateLimiter, (req, res) => {
  const expected = process.env.STAGEFLOW_ACCESS_PASSWORD;
  if (!expected) {
    return res.json({ ok: true, enabled: false });
  }
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password) {
    return res.status(400).json({ ok: false, error: 'Mot de passe requis' });
  }
  if (password !== expected) {
    return res.status(401).json({ ok: false, error: 'Mot de passe incorrect' });
  }
  res.json({ ok: true, enabled: true });
});

module.exports = router;
