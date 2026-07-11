// Routes: Gestion des Facultés et Départements
const express = require('express');
const router = express.Router();
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const User = require('../models/User');
const { 
  authMiddleware, 
  requireRole, 
  checkFacultyAccess,
  getAccessFilter 
} = require('../middleware/accessControl');

// ═══════════════════════════════════════════════════════════════════════
// ROUTES FACULTÉ - Admin Université uniquement
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/faculties
 * Créer une nouvelle faculté (Admin Université)
 */
router.post('/', 
  authMiddleware,
  requireRole('admin_universite'),
  async (req, res) => {
    try {
      const { name, code, dean, description } = req.body;

      // Validation
      if (!name || !code) {
        return res.status(400).json({ 
          error: 'Les champs "name" et "code" sont obligatoires' 
        });
      }

      // Vérifier les doublons
      const existingFaculty = await Faculty.findOne({
        name,
        university: req.user.university._id
      });

      if (existingFaculty) {
        return res.status(409).json({ 
          error: `Une faculté nommée "${name}" existe déjà dans cette université` 
        });
      }

      const faculty = new Faculty({
        name,
        code: code.toUpperCase(),
        university: req.user.university._id,
        dean,
        description
      });

      await faculty.save();

      res.status(201).json({
        message: 'Faculté créée avec succès',
        faculty: faculty.toObject()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Erreur lors de la création de la faculté',
        details: error.message 
      });
    }
  }
);

/**
 * GET /api/faculties
 * Lister les facultés accessibles
 */
router.get('/', 
  authMiddleware,
  async (req, res) => {
    try {
      let filter = { university: req.user.university._id };

      // Admin de faculté: voir uniquement SA faculté
      if (req.user.role === 'admin_faculte') {
        filter._id = req.user.faculty._id;
      }

      const faculties = await Faculty.find(filter)
        .populate('university', 'name acronym')
        .select('-__v')
        .sort({ createdAt: -1 });

      res.json({
        count: faculties.length,
        faculties
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des facultés',
        details: error.message 
      });
    }
  }
);

/**
 * GET /api/faculties/:facultyId
 * Détails d'une faculté
 */
router.get('/:facultyId', 
  authMiddleware,
  checkFacultyAccess,
  async (req, res) => {
    try {
      const faculty = await Faculty.findById(req.params.facultyId)
        .populate('university', 'name acronym')
        .populate({
          path: 'departments',
          model: 'Department',
          select: 'name code headOfDepartment isActive'
        });

      if (!faculty) {
        return res.status(404).json({ error: 'Faculté non trouvée' });
      }

      res.json(faculty);
    } catch (error) {
      res.status(500).json({ 
        error: 'Erreur lors de la récupération de la faculté',
        details: error.message 
      });
    }
  }
);

/**
 * PUT /api/faculties/:facultyId
 * Modifier une faculté (Admin Université ou Admin Faculté)
 */
router.put('/:facultyId', 
  authMiddleware,
  checkFacultyAccess,
  async (req, res) => {
    try {
      const { name, code, dean, description } = req.body;

      const faculty = await Faculty.findByIdAndUpdate(
        req.params.facultyId,
        {
          ...(name && { name }),
          ...(code && { code: code.toUpperCase() }),
          ...(dean && { dean }),
          ...(description && { description }),
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      res.json({
        message: 'Faculté mise à jour avec succès',
        faculty: faculty.toObject()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Erreur lors de la mise à jour de la faculté',
        details: error.message 
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════
// ROUTES DÉPARTEMENT - Créer/Gérer sous une Faculté
// ═══════════════════════════════════════════════════════════════════════

/**
 * POST /api/faculties/:facultyId/departments
 * Créer un nouveau département dans une faculté
 * 🔑 Clé: Admin Faculté peut créer des depts dans SA faculté
 */
router.post('/:facultyId/departments',
  authMiddleware,
  checkFacultyAccess,
  async (req, res) => {
    try {
      const { name, code, headOfDepartment, stagesCoordinator, description, maxStudents } = req.body;

      // Validation
      if (!name || !code) {
        return res.status(400).json({ 
          error: 'Les champs "name" et "code" sont obligatoires' 
        });
      }

      // Vérifier que la faculté existe
      const faculty = await Faculty.findById(req.params.facultyId);
      if (!faculty) {
        return res.status(404).json({ error: 'Faculté non trouvée' });
      }

      // Vérifier les doublons au niveau de la faculté
      const existingDept = await Department.findOne({
        code: code.toUpperCase(),
        faculty: req.params.facultyId
      });

      if (existingDept) {
        return res.status(409).json({ 
          error: `Un département avec le code "${code}" existe déjà dans cette faculté` 
        });
      }

      // Créer le département
      const department = new Department({
        name,
        code: code.toUpperCase(),
        university: faculty.university,
        faculty: req.params.facultyId,
        headOfDepartment,
        stagesCoordinator,
        description,
        maxStudents: maxStudents || 100
      });

      await department.save();

      res.status(201).json({
        message: 'Département créé avec succès dans la faculté',
        department: department.toObject()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Erreur lors de la création du département',
        details: error.message 
      });
    }
  }
);

/**
 * GET /api/faculties/:facultyId/departments
 * Lister les départements d'une faculté
 */
router.get('/:facultyId/departments',
  authMiddleware,
  checkFacultyAccess,
  async (req, res) => {
    try {
      const departments = await Department.find({
        faculty: req.params.facultyId
      })
        .populate('faculty', 'name code')
        .populate('university', 'name acronym')
        .select('-__v')
        .sort({ createdAt: -1 });

      res.json({
        count: departments.length,
        facultyId: req.params.facultyId,
        departments
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Erreur lors de la récupération des départements',
        details: error.message 
      });
    }
  }
);

/**
 * GET /api/departments/:departmentId
 * Détails d'un département
 */
router.get('/departments/:departmentId',
  authMiddleware,
  async (req, res) => {
    try {
      const department = await Department.findById(req.params.departmentId)
        .populate('faculty', 'name code')
        .populate('university', 'name acronym');

      if (!department) {
        return res.status(404).json({ error: 'Département non trouvé' });
      }

      // Vérifier l'accès
      const accessFilter = getAccessFilter(req);
      if (accessFilter.department && department._id.toString() !== accessFilter.department.toString()) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      res.json(department);
    } catch (error) {
      res.status(500).json({ 
        error: 'Erreur lors de la récupération du département',
        details: error.message 
      });
    }
  }
);

/**
 * PUT /api/faculties/:facultyId/departments/:departmentId
 * Modifier un département (Admin Faculté ou Admin Département)
 */
router.put('/:facultyId/departments/:departmentId',
  authMiddleware,
  checkFacultyAccess,
  async (req, res) => {
    try {
      const { name, code, headOfDepartment, stagesCoordinator, description, maxStudents } = req.body;

      // Vérifier que le département existe et appartient à cette faculté
      const department = await Department.findOne({
        _id: req.params.departmentId,
        faculty: req.params.facultyId
      });

      if (!department) {
        return res.status(404).json({ error: 'Département non trouvé dans cette faculté' });
      }

      // Mise à jour
      const updatedDept = await Department.findByIdAndUpdate(
        req.params.departmentId,
        {
          ...(name && { name }),
          ...(code && { code: code.toUpperCase() }),
          ...(headOfDepartment && { headOfDepartment }),
          ...(stagesCoordinator && { stagesCoordinator }),
          ...(description && { description }),
          ...(maxStudents && { maxStudents }),
          updatedAt: new Date()
        },
        { new: true, runValidators: true }
      );

      res.json({
        message: 'Département mis à jour avec succès',
        department: updatedDept.toObject()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Erreur lors de la mise à jour du département',
        details: error.message 
      });
    }
  }
);

module.exports = router;
