// University Schema - Racine de la hiérarchie
const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  acronym: {
    type: String,
    required: true,
    uppercase: true
  },
  wilaya: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: String,
  address: String,
  website: String,
  logo: String,
  isActive: {
    type: Boolean,
    default: true
  },
  subscriptionPlan: {
    type: String,
    enum: ['Gratuit', 'Basique', 'Standard', 'Premium'],
    default: 'Gratuit'
  },
  subscriptionExpiry: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('University', universitySchema);
