const mongoose = require('mongoose');

const financeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['entrée', 'sortie'],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
    // Entrées: Facture client, Acompte, Bonus, Autre
    // Sorties: Salaire, Loyer, Logiciel, Publicité, Matériel, Sous-traitance, Impôts, Autre
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'XOF',
    enum: ['XOF', 'EUR', 'USD', 'MAD']
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['virement', 'espèces', 'mobile_money', 'chèque', 'carte', 'autre'],
    default: 'virement'
  },
  reference: {
    type: String,
    trim: true,
    default: ''
  },
  // Liaison optionnelle
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Finance', financeSchema);
