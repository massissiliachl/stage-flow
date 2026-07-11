// Faculty Schema - Niveau intermédiaire
const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
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
  dean: {
    name: String,
    email: String,
    phone: String
  },
  description: String,
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

// Index composite pour éviter les doublons par université
facultySchema.index({ name: 1, university: 1 }, { unique: true });

module.exports = mongoose.model('Faculty', facultySchema);
