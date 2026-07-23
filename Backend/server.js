require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Dev : accepte localhost, file:// (Origin: null), tous ports locaux
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth/entreprise', require('./routes/auth-entreprise'));
app.use('/api/auth/etudiant', require('./routes/auth-etudiant'));
app.use('/api/entreprise', require('./routes/entreprise-data'));
const { entreprisesRouter, demandesRouter, conventionsRouter } = require('./routes/entreprises-list');
app.use('/api/entreprises', entreprisesRouter);
app.use('/api/demandes', demandesRouter);
app.use('/api/conventions', conventionsRouter);
app.use('/api/rapports', require('./routes/stage-reports').stageReportsRouter);
app.use('/api/attestations', require('./routes/stage-attestations').stageAttestationsRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'StageFlow API',
    health: '/api/health',
    auth: {
      register: 'POST /api/auth/entreprise/register',
      login: 'POST /api/auth/entreprise/login',
      ping: 'GET /api/auth/entreprise/ping',
    },
    entreprise: {
      dashboard: 'GET /api/entreprise/:entrepriseId/dashboard',
      profile: 'GET|PATCH /api/entreprise/:entrepriseId/profile',
    },
    etudiant: {
      entreprises: 'GET /api/entreprises',
      demandes: 'GET|POST /api/demandes',
      acceptDemande: 'PATCH /api/demandes/:id/accept',
      rejectDemande: 'PATCH /api/demandes/:id/reject',
      cancelDemande: 'PATCH /api/demandes/:id/cancel',
      conventions: 'GET /api/conventions?studentName=...',
    },
  });
});

app.get('/api/health', async (req, res) => {
  const status = {
    server: 'ok',
    postgres: { connected: false },
    authEntreprise: 'ready',
  };

  if (!process.env.DATABASE_URL) {
    status.postgres = { connected: false, error: 'DATABASE_URL manquant dans .env' };
    return res.status(503).json(status);
  }

  try {
    const { getPool } = require('./lib/db');
    const pool = getPool();
    const result = await pool.query('SELECT NOW() AS now, current_database() AS db');
    status.postgres = {
      connected: true,
      database: result.rows[0].db,
      serverTime: result.rows[0].now,
    };
    res.status(200).json(status);
  } catch (err) {
    status.postgres = { connected: false, error: err.message };
    res.status(503).json(status);
  }
});

const server = app.listen(PORT);

server.on('listening', () => {
  console.log(`StageFlow API — http://localhost:${PORT}`);
  console.log(`Health        — http://localhost:${PORT}/api/health`);
  console.log(`Inscription   — POST http://localhost:${PORT}/api/auth/entreprise/register`);
  console.log(`Connexion     — POST http://localhost:${PORT}/api/auth/entreprise/login`);
  if (!process.env.DATABASE_URL) {
    console.warn('⚠ DATABASE_URL absent — copiez .env.example vers .env');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Erreur : le port ${PORT} est déjà utilisé.`);
    console.error('Fermez l\'autre terminal ou exécutez : npm run stop');
  } else {
    console.error('Erreur serveur :', err.message);
  }
  process.exit(1);
});
