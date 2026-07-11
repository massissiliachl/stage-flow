// INTÉGRATION: Mise à jour de server.js
// Voici les modifications/ajouts à faire dans votre server.js existant

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ─────────────────────────────────────────────────────────────
// IMPORTS DES NOUVEAUX MODÈLES ET ROUTES
// ─────────────────────────────────────────────────────────────
const University = require('./models/University');
const Faculty = require('./models/Faculty');
const Department = require('./models/Department');
const User = require('./models/User');
const facultyRoutes = require('./routes/faculties');
const { authMiddleware } = require('./middleware/accessControl');

// ─────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// CONNEXION MONGODB
// ─────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stageflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ Erreur MongoDB:', err));

// ─────────────────────────────────────────────────────────────
// ROUTES EXISTANTES (garder vos routes actuelles)
// ─────────────────────────────────────────────────────────────
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/conventions', require('./routes/conventions'));
// etc...

// ─────────────────────────────────────────────────────────────
// NOUVELLES ROUTES AVEC HIÉRARCHIE
// ─────────────────────────────────────────────────────────────
// Routes Faculties & Departments avec contrôle d'accès
app.use('/api/faculties', authMiddleware, facultyRoutes);

// ─────────────────────────────────────────────────────────────
// ROUTE DE DÉMO: Créer une hiérarchie complète
// ─────────────────────────────────────────────────────────────
app.post('/api/demo/setup-hierarchy', async (req, res) => {
  try {
    // 1. Créer une université
    const university = new University({
      name: 'Université Abderrahmane Mira — Béjaïa',
      acronym: 'UAMB',
      wilaya: 'Béjaïa',
      email: 'admin@univ-bejaia.dz',
      phone: '+213 34 XX XX XX',
      website: 'www.univ-bejaia.dz'
    });
    await university.save();
    console.log('✅ Université créée:', university.name);

    // 2. Créer des facultés sous cette université
    const faculty1 = new Faculty({
      name: 'Faculté des Sciences Humaines et Sociales',
      code: 'FSHS',
      university: university._id,
      dean: {
        name: 'Dr. Mohamed Belkaïd',
        email: 'dean.fshs@univ-bejaia.dz'
      }
    });
    await faculty1.save();
    console.log('✅ Faculté créée:', faculty1.name);

    // 3. Créer des départements sous la faculté
    const dept1 = new Department({
      name: 'Département Sciences de l\'Information et de la Communication',
      code: 'SIC',
      university: university._id,
      faculty: faculty1._id,
      headOfDepartment: {
        name: 'Dr. Meziane Souad',
        email: 'head.sic@univ-bejaia.dz'
      },
      stagesCoordinator: {
        name: 'Mme. Djatout Fatima',
        email: 'coordinator.sic@univ-bejaia.dz'
      }
    });
    await dept1.save();
    console.log('✅ Département créé:', dept1.name);

    // 4. Créer des utilisateurs avec rôles
    const bcrypt = require('bcryptjs');
    
    // Admin Université
    const adminUniv = new User({
      email: 'admin@univ-bejaia.dz',
      password: await bcrypt.hash('admin123', 10),
      firstName: 'Admin',
      lastName: 'Université',
      role: 'admin_universite',
      university: university._id
    });
    await adminUniv.save();

    // Admin Faculté
    const adminFaculty = new User({
      email: 'admin.fshs@univ-bejaia.dz',
      password: await bcrypt.hash('faculty123', 10),
      firstName: 'Admin',
      lastName: 'FSHS',
      role: 'admin_faculte',
      university: university._id,
      faculty: faculty1._id
    });
    await adminFaculty.save();

    // Admin Département
    const adminDept = new User({
      email: 'admin.sic@univ-bejaia.dz',
      password: await bcrypt.hash('dept123', 10),
      firstName: 'Dr.',
      lastName: 'Meziane Souad',
      role: 'admin_departement',
      university: university._id,
      faculty: faculty1._id,
      department: dept1._id
    });
    await adminDept.save();

    res.json({
      message: '✅ Hiérarchie créée avec succès',
      university: university.toObject(),
      faculty: faculty1.toObject(),
      department: dept1.toObject(),
      credentials: {
        adminUniversity: { email: 'admin@univ-bejaia.dz', password: 'admin123' },
        adminFaculty: { email: 'admin.fshs@univ-bejaia.dz', password: 'faculty123' },
        adminDepartment: { email: 'admin.sic@univ-bejaia.dz', password: 'dept123' }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création', details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE LOGIN
// ─────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const authService = require('./services/authService');
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ROUTE DE TEST: Voir sa hiérarchie
// ─────────────────────────────────────────────────────────────
app.get('/api/me/hierarchy', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        email: req.user.email,
        role: req.user.role,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      hierarchy: {
        university: req.user.university,
        faculty: req.user.faculty || 'N/A',
        department: req.user.department || 'N/A'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DÉMARRAGE DU SERVEUR
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur StageFlow lancé sur le port ${PORT}`);
  console.log(`📝 Pour tester: POST /api/demo/setup-hierarchy`);
});

module.exports = app;
