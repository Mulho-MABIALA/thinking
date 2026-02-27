const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  email: {
    type: String,
    required: [true, "L'email est requis"],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  projectType: {
    type: String,
    required: [true, 'Le type de projet est requis']
  },
  description: {
    type: String,
    required: [true, 'La description est requise']
  },
  status: {
    type: String,
    enum: ['nouveau', 'en_cours', 'traité', 'archivé'],
    default: 'nouveau'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
