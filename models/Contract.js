const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  number: { type: String, unique: true },
  clientName: { type: String, required: true, trim: true },
  clientEmail: { type: String, required: true, trim: true },
  clientPhone: { type: String, trim: true },
  clientAddress: { type: String, trim: true },
  projectType: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'XOF' },
  startDate: { type: Date },
  endDate: { type: Date },
  status: {
    type: String,
    enum: ['brouillon', 'envoyé', 'signé', 'archivé'],
    default: 'brouillon'
  },
  notes: { type: String, default: '' },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }
}, { timestamps: true });

// Auto-génération numéro contrat
contractSchema.pre('save', async function (next) {
  if (!this.number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Contract').countDocuments();
    this.number = `CT-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Contract', contractSchema);
