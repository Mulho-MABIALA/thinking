const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Le type est requis'],
    enum: {
      values: ['financier', 'commercial', 'activité', 'client', 'projet', 'personnalisé'],
      message: 'Type invalide'
    }
  },
  period: {
    type: String,
    enum: ['hebdomadaire', 'mensuel', 'trimestriel', 'annuel', 'personnalisé'],
    default: 'mensuel'
  },
  dateFrom: {
    type: Date,
    required: [true, 'La date de début est requise']
  },
  dateTo: {
    type: Date,
    required: [true, 'La date de fin est requise']
  },
  status: {
    type: String,
    enum: ['brouillon', 'publié', 'archivé'],
    default: 'brouillon'
  },
  summary: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    default: ''
  },
  metrics: {
    // Métriques clés du rapport (libres)
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: String,
    default: 'Admin'
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
