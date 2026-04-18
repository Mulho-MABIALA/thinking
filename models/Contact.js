const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  author: { type: String, default: 'Admin' },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

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
  },
  // ── Commentaires internes (threaded notes) ────────────────
  internalNotes: {
    type: [noteSchema],
    default: []
  },
  // ── Statut de lecture ─────────────────────────────────────
  readAt: {
    type: Date,
    default: null
  },
  // ── Soft delete ───────────────────────────────────────────
  deletedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Indexes for common query patterns
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ email: 1 });
contactSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('Contact', contactSchema);
