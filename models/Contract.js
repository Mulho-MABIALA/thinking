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
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
  // ── Signature électronique ────────────────────────────────
  signatureToken: { type: String, default: null, select: false },
  signatureTokenExpiry: { type: Date, default: null },
  signedAt: { type: Date, default: null },
  signatureIp: { type: String, default: null },
  signatureData: { type: String, default: null },
  // ── Soft delete ───────────────────────────────────────────
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// Indexes for common query patterns
contractSchema.index({ status: 1 });
contractSchema.index({ createdAt: -1 });
contractSchema.index({ clientEmail: 1 });
contractSchema.index({ signatureToken: 1 });
contractSchema.index({ deletedAt: 1 });

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
