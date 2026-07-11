// Department Schema (MODIFIÉ) - Niveau opérationnel
const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  university: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'University',
    required: true
  },
  // NOUVEAU: Clé étrangère vers Faculty
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  headOfDepartment: {
    name: String,
    email: String,
    phone: String
  },
  stagesCoordinator: {
    name: String,
    email: String,
    phone: String
  },
  description: String,
  maxStudents: {
    type: Number,
    default: 100
  },
  currentStudents: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index composite pour éviter les doublons
departmentSchema.index({ code: 1, faculty: 1 }, { unique: true });

// Middleware: Valider que le département appartient à la bonne université
departmentSchema.pre('save', async function(next) {
  if (this.faculty) {
    const Faculty = require('./Faculty');
    const faculty = await Faculty.findById(this.faculty);
    if (faculty && faculty.university.toString() !== this.university.toString()) {
      throw new Error('Le département doit appartenir à une faculté de la même université');
    }
  }
  next();
});

module.exports = mongoose.model('Department', departmentSchema);
