const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  number: { type: String, unique: true },
  clientName: { type: String, required: true, trim: true },
  clientEmail: { type: String, required: true, trim: true },
  clientPhone: { type: String, trim: true },
  clientAddress: { type: String, trim: true },
  items: [invoiceItemSchema],
  subtotal: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: 'XOF' },
  dueDate: { type: Date },
  paidAt: { type: Date },
  status: {
    type: String,
    enum: ['en_attente', 'payé', 'annulé'],
    default: 'en_attente'
  },
  notes: { type: String, default: '' },
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
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
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ clientEmail: 1 });
invoiceSchema.index({ signatureToken: 1 });
invoiceSchema.index({ deletedAt: 1 });

// Auto-génération numéro facture
invoiceSchema.pre('save', async function (next) {
  if (!this.number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Invoice').countDocuments();
    this.number = `FAC-${year}-${String(count + 1).padStart(3, '0')}`;
  }
  // Calcul automatique des totaux
  this.subtotal = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  this.taxAmount = this.subtotal * (this.taxRate / 100);
  this.total = this.subtotal + this.taxAmount;
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
