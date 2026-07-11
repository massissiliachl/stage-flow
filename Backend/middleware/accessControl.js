// Middleware d'authentification et contrôle d'accès hiérarchique
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');

/**
 * Middleware: Vérifier JWT et charger l'utilisateur
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId)
      .populate('university')
      .populate('faculty')
      .populate('department');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token invalide', details: error.message });
  }
};

/**
 * Middleware: Vérifier que l'utilisateur a le rôle requis
 */
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé: rôle insuffisant' });
    }
    next();
  };
};

/**
 * Middleware: Vérifier l'accès à une faculté
 * Un admin_faculte ne peut voir que SA faculté
 */
exports.checkFacultyAccess = async (req, res, next) => {
  try {
    const { facultyId } = req.params;
    
    if (req.user.role === 'admin_universite') {
      // Admin université: accès à toutes les facultés
      return next();
    }

    if (req.user.role === 'admin_faculte') {
      // Admin faculté: vérifier qu'il accède à SA faculté
      if (req.user.faculty._id.toString() !== facultyId) {
        return res.status(403).json({ 
          error: 'Accès refusé: vous pouvez uniquement accéder à votre propre faculté',
          yourFacultyId: req.user.faculty._id
        });
      }
      return next();
    }

    res.status(403).json({ error: 'Rôle non autorisé pour cet accès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur de contrôle d\'accès', details: error.message });
  }
};

/**
 * Middleware: Vérifier l'accès à un département
 * Cascade: admin_universite > admin_faculte > admin_departement
 */
exports.checkDepartmentAccess = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const department = await Department.findById(departmentId)
      .populate('faculty');

    if (!department) {
      return res.status(404).json({ error: 'Département non trouvé' });
    }

    if (req.user.role === 'admin_universite') {
      // Admin université: accès complet
      req.department = department;
      return next();
    }

    if (req.user.role === 'admin_faculte') {
      // Admin faculté: vérifier que le département est dans SA faculté
      if (department.faculty._id.toString() !== req.user.faculty._id.toString()) {
        return res.status(403).json({ 
          error: 'Accès refusé: ce département n\'appartient pas à votre faculté',
          yourFacultyId: req.user.faculty._id
        });
      }
      req.department = department;
      return next();
    }

    if (req.user.role === 'admin_departement') {
      // Admin département: vérifier que c'est SON département
      if (department._id.toString() !== req.user.department._id.toString()) {
        return res.status(403).json({ 
          error: 'Accès refusé: vous pouvez uniquement accéder à votre propre département'
        });
      }
      req.department = department;
      return next();
    }

    res.status(403).json({ error: 'Rôle non autorisé pour cet accès' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur de contrôle d\'accès', details: error.message });
  }
};

/**
 * Middleware: Filtrer les données selon la hiérarchie
 * Retourne les objets query MongoDB pré-filtrés
 */
exports.getAccessFilter = (req) => {
  const filter = {};

  if (req.user.role === 'admin_universite') {
    // Accès total à l'université
    filter.university = req.user.university._id;
  } 
  else if (req.user.role === 'admin_faculte') {
    // Accès limité à SA faculté
    filter.faculty = req.user.faculty._id;
  }
  else if (req.user.role === 'admin_departement') {
    // Accès limité à SON département
    filter.department = req.user.department._id;
  }

  return filter;
};

module.exports = exports;
