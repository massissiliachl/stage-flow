// Service: Authentification et JWT
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

/**
 * Générer un JWT token
 */
exports.generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/**
 * Créer un utilisateur Admin Faculté
 * Utilisé lors de la création d'une faculté
 */
exports.createFacultyAdmin = async (email, password, firstName, lastName, university, faculty) => {
  try {
    // Vérifier que le user existe pas déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error(`Un utilisateur avec l'email ${email} existe déjà`);
    }

    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: 'admin_faculte',
      university,
      faculty,
      department: null // Admin de faculté n'a pas accès à un département spécifique
    });

    await user.save();
    const token = exports.generateToken(user._id, user.role);

    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        faculty: user.faculty
      },
      token
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Créer un utilisateur Admin Département
 */
exports.createDepartmentAdmin = async (email, password, firstName, lastName, university, faculty, department) => {
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error(`Un utilisateur avec l'email ${email} existe déjà`);
    }

    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: 'admin_departement',
      university,
      faculty,
      department
    });

    await user.save();
    const token = exports.generateToken(user._id, user.role);

    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department
      },
      token
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Login utilisateur
 */
exports.login = async (email, password) => {
  try {
    const user = await User.findOne({ email })
      .populate('university')
      .populate('faculty')
      .populate('department');

    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Email ou mot de passe incorrect');
    }

    user.lastLogin = new Date();
    await user.save();

    const token = exports.generateToken(user._id, user.role);

    return {
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        university: user.university,
        faculty: user.faculty,
        department: user.department
      },
      token
    };
  } catch (error) {
    throw error;
  }
};

module.exports = exports;
