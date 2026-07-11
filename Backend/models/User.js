// User Schema (MODIFIÉ) - Intégration hiérarchie
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: String,
  lastName: String,
  phone: String,
  
  role: {
    type: String,
    enum: [
      'admin_universite',
      'admin_faculte',
      'admin_departement',
      'responsable_stages',
      'enseignant',
      'etudiant',
      'entreprise'
    ],
    required: true
  },

  // HIÉRARCHIE UNIVERSITAIRE
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
    required: true
  },
  
  // NOUVEAU: Faculté - Pour les admins de faculté
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: function() { return this.role === 'admin_faculte'; },
    default: null
  },

  // Département - Pour les admins de département, responsables, enseignants
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: function() { 
      return ['admin_departement', 'responsable_stages', 'enseignant'].includes(this.role); 
    },
    default: null
  },

  // Données spécifiques étudiant
  studentData: {
    matricule: String,
    specialty: String,
    promotion: String
  },

  // Données spécifiques entreprise
  companyData: {
    company: String,
    rc: String,
    nif: String,
    sector: String,
    wilaya: String,
    logo: String
  },

  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Hacher le mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Comparer les mots de passe
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
