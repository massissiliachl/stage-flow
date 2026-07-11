// seed.js - Initialiser la base de données avec des données de test

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const University = require('./models/University');
const Faculty = require('./models/Faculty');
const Department = require('./models/Department');
const User = require('./models/User');

async function seed() {
  try {
    // Connexion MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stageflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connecté');

    // Nettoyer les collections existantes (optionnel)
    await Promise.all([
      University.deleteMany({}),
      Faculty.deleteMany({}),
      Department.deleteMany({}),
      User.deleteMany({})
    ]);
    console.log('🗑️ Collections nettoyées');

    // ─────────────────────────────────────────────────────────
    // 1. Créer l'Université
    // ─────────────────────────────────────────────────────────
    const university = new University({
      name: 'Université Abderrahmane Mira — Béjaïa',
      acronym: 'UAMB',
      wilaya: 'Béjaïa',
      email: 'admin@univ-bejaia.dz',
      phone: '+213 34 XX XX XX',
      address: 'Béjaïa, Algérie',
      website: 'www.univ-bejaia.dz',
      subscriptionPlan: 'Standard',
      subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 an
    });
    await university.save();
    console.log('✅ Université créée:', university.name);

    // ─────────────────────────────────────────────────────────
    // 2. Créer les Facultés
    // ─────────────────────────────────────────────────────────
    const faculty1 = new Faculty({
      name: 'Faculté des Sciences Humaines et Sociales',
      code: 'FSHS',
      university: university._id,
      dean: {
        name: 'Dr. Mohamed Belkaïd',
        email: 'dean.fshs@univ-bejaia.dz',
        phone: '+213 34 XX XX XX'
      },
      description: 'Faculté responsable des sciences humaines et sociales'
    });
    await faculty1.save();

    const faculty2 = new Faculty({
      name: 'Faculté des Sciences et Technologies',
      code: 'FST',
      university: university._id,
      dean: {
        name: 'Dr. Fatima Zahra Bouabid',
        email: 'dean.fst@univ-bejaia.dz',
        phone: '+213 34 YY YY YY'
      },
      description: 'Faculté responsable des sciences exactes et technologies'
    });
    await faculty2.save();

    console.log('✅ Facultés créées: FSHS, FST');

    // ─────────────────────────────────────────────────────────
    // 3. Créer les Départements
    // ─────────────────────────────────────────────────────────
    const dept1 = new Department({
      name: 'Département Sciences de l\'Information et de la Communication',
      code: 'SIC',
      university: university._id,
      faculty: faculty1._id,
      headOfDepartment: {
        name: 'Dr. Meziane Souad',
        email: 'head.sic@univ-bejaia.dz',
        phone: '+213 34 AA AA AA'
      },
      stagesCoordinator: {
        name: 'Mme. Djatout Fatima',
        email: 'coord.sic@univ-bejaia.dz',
        phone: '+213 34 BB BB BB'
      },
      description: 'Département dédié à la communication et l\'information',
      maxStudents: 150
    });
    await dept1.save();

    const dept2 = new Department({
      name: 'Département Informatique',
      code: 'INFORMATIQUE',
      university: university._id,
      faculty: faculty2._id,
      headOfDepartment: {
        name: 'Dr. Karim Belkadi',
        email: 'head.info@univ-bejaia.dz',
        phone: '+213 34 CC CC CC'
      },
      stagesCoordinator: {
        name: 'M. Leila Ouali',
        email: 'coord.info@univ-bejaia.dz',
        phone: '+213 34 DD DD DD'
      },
      description: 'Département des sciences informatiques',
      maxStudents: 200
    });
    await dept2.save();

    const dept3 = new Department({
      name: 'Département Génie Civil',
      code: 'GC',
      university: university._id,
      faculty: faculty2._id,
      headOfDepartment: {
        name: 'Dr. Ahmed Saidane',
        email: 'head.gc@univ-bejaia.dz',
        phone: '+213 34 EE EE EE'
      },
      stagesCoordinator: {
        name: 'Mme. Sarah Bennani',
        email: 'coord.gc@univ-bejaia.dz',
        phone: '+213 34 FF FF FF'
      },
      description: 'Département du génie civil et construction',
      maxStudents: 120
    });
    await dept3.save();

    console.log('✅ Départements créés: SIC, INFORMATIQUE, GC');

    // ─────────────────────────────────────────────────────────
    // 4. Créer les Utilisateurs avec les Rôles
    // ─────────────────────────────────────────────────────────

    // Admin Université
    const adminUniv = new User({
      email: 'admin@univ-bejaia.dz',
      password: await bcrypt.hash('admin123', 10),
      firstName: 'Admin',
      lastName: 'Université',
      phone: '+213 34 XX XX XX',
      role: 'admin_universite',
      university: university._id
    });
    await adminUniv.save();
    console.log('✅ Admin Université créé');

    // Admin Faculté FSHS
    const adminFaculty1 = new User({
      email: 'admin.fshs@univ-bejaia.dz',
      password: await bcrypt.hash('faculty123', 10),
      firstName: 'Admin',
      lastName: 'FSHS',
      phone: '+213 34 XX XX XX',
      role: 'admin_faculte',
      university: university._id,
      faculty: faculty1._id
    });
    await adminFaculty1.save();

    // Admin Faculté FST
    const adminFaculty2 = new User({
      email: 'admin.fst@univ-bejaia.dz',
      password: await bcrypt.hash('faculty123', 10),
      firstName: 'Admin',
      lastName: 'FST',
      phone: '+213 34 YY YY YY',
      role: 'admin_faculte',
      university: university._id,
      faculty: faculty2._id
    });
    await adminFaculty2.save();
    console.log('✅ Admins Faculté créés');

    // Admin Département SIC
    const adminDept1 = new User({
      email: 'admin.sic@univ-bejaia.dz',
      password: await bcrypt.hash('dept123', 10),
      firstName: 'Dr.',
      lastName: 'Meziane Souad',
      phone: '+213 34 AA AA AA',
      role: 'admin_departement',
      university: university._id,
      faculty: faculty1._id,
      department: dept1._id
    });
    await adminDept1.save();

    // Admin Département Informatique
    const adminDept2 = new User({
      email: 'admin.informatique@univ-bejaia.dz',
      password: await bcrypt.hash('dept123', 10),
      firstName: 'Dr.',
      lastName: 'Karim Belkadi',
      phone: '+213 34 CC CC CC',
      role: 'admin_departement',
      university: university._id,
      faculty: faculty2._id,
      department: dept2._id
    });
    await adminDept2.save();

    // Responsable de Stages
    const coordStages = new User({
      email: 'coord.sic@univ-bejaia.dz',
      password: await bcrypt.hash('coord123', 10),
      firstName: 'Mme.',
      lastName: 'Djatout Fatima',
      phone: '+213 34 BB BB BB',
      role: 'responsable_stages',
      university: university._id,
      faculty: faculty1._id,
      department: dept1._id
    });
    await coordStages.save();

    // Étudiant
    const student = new User({
      email: 'n.djatout@univ-bejaia.dz',
      password: await bcrypt.hash('student123', 10),
      firstName: 'Nour El Houda',
      lastName: 'Djatout',
      phone: '+213 6XX XX XX XX',
      role: 'etudiant',
      university: university._id,
      faculty: faculty1._id,
      department: dept1._id,
      studentData: {
        matricule: '24/00312/CRP',
        specialty: 'Master 2 Communication et Relations Publiques',
        promotion: '2025-2026'
      }
    });
    await student.save();

    // Entreprise
    const company = new User({
      email: 'rh@cevital.com',
      password: await bcrypt.hash('company123', 10),
      firstName: 'Direction',
      lastName: 'RH',
      phone: '+213 34 XX XX XX',
      role: 'entreprise',
      university: university._id,
      companyData: {
        company: 'Cevital',
        rc: 'RC-12345678',
        nif: 'NIF-98765432',
        sector: 'Agroalimentaire',
        wilaya: 'Béjaïa',
        logo: 'https://...'
      }
    });
    await company.save();

    console.log('✅ Utilisateurs créés:');
    console.log('  - admin@univ-bejaia.dz (admin_universite)');
    console.log('  - admin.fshs@univ-bejaia.dz (admin_faculte)');
    console.log('  - admin.sic@univ-bejaia.dz (admin_departement)');
    console.log('  - coord.sic@univ-bejaia.dz (responsable_stages)');
    console.log('  - n.djatout@univ-bejaia.dz (etudiant)');
    console.log('  - rh@cevital.com (entreprise)');

    // ─────────────────────────────────────────────────────────
    // 5. Afficher le résumé
    // ─────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Seed terminé avec succès!');
    console.log('='.repeat(60));
    console.log('\n📋 HIÉRARCHIE CRÉÉE:\n');
    console.log(`  🏛️  ${university.name}`);
    console.log(`      ├── 📚 ${faculty1.name}`);
    console.log(`      │    ├── 🏢 ${dept1.name}`);
    console.log(`      ├── 📚 ${faculty2.name}`);
    console.log(`      │    ├── 🏢 ${dept2.name}`);
    console.log(`      │    ├── 🏢 ${dept3.name}`);
    console.log('\n🔑 IDENTIFIANTS DE TEST:\n');
    console.log('Admin Université:');
    console.log('  Email: admin@univ-bejaia.dz');
    console.log('  Password: admin123\n');
    console.log('Admin Faculté (FSHS):');
    console.log('  Email: admin.fshs@univ-bejaia.dz');
    console.log('  Password: faculty123\n');
    console.log('Admin Département (SIC):');
    console.log('  Email: admin.sic@univ-bejaia.dz');
    console.log('  Password: dept123\n');
    console.log('Étudiant:');
    console.log('  Email: n.djatout@univ-bejaia.dz');
    console.log('  Password: student123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error.message);
    process.exit(1);
  }
}

// Exécuter le seed
seed();
