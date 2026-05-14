const express = require('express');
const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const Finance = require('../models/Finance');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');
const router = express.Router();

const log = (action, invoice, req) => ActivityLog.create({
  action, entity: 'invoice',
  entityId: invoice._id?.toString(),
  entityLabel: invoice.number || invoice.clientName,
  user: req.user?.name || req.user?.email || 'Admin',
  ip: req.ip || req.headers['x-forwarded-for'],
}).catch(() => {});

// ── Routes publiques (signature) ─ AVANT les routes protégées ────────────────

// GET /api/invoices/sign/:token - Récupérer une facture pour signature (public)
router.get('/sign/:token', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      signatureToken: req.params.token,
      signatureTokenExpiry: { $gt: new Date() },
      deletedAt: null
    }).select('-signatureToken -signatureTokenExpiry');

    if (!invoice) return res.status(404).json({ message: 'Lien de signature invalide ou expiré' });
    if (invoice.signedAt) return res.status(400).json({ message: 'Cette facture a déjà été signée', signedAt: invoice.signedAt });
    return res.json(invoice);
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// POST /api/invoices/sign/:token - Signer une facture (public)
router.post('/sign/:token', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      signatureToken: req.params.token,
      signatureTokenExpiry: { $gt: new Date() },
      deletedAt: null
    });

    if (!invoice) return res.status(404).json({ message: 'Lien de signature invalide ou expiré' });
    if (invoice.signedAt) return res.status(400).json({ message: 'Cette facture a déjà été signée' });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    invoice.signedAt = new Date();
    invoice.signatureIp = String(ip).split(',')[0].trim();
    invoice.signatureData = req.body.signatureData || null;
    invoice.signatureToken = null;
    invoice.signatureTokenExpiry = null;
    await invoice.save();

    return res.json({ message: 'Facture signée avec succès', signedAt: invoice.signedAt });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ── Routes protégées ──────────────────────────────────────────────────────────

// GET /api/invoices (exclut les soft-deleted)
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = { deletedAt: null };
    if (status) query.status = status;
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('contact', 'name email')
      .populate('contract', 'number');
    const total = await Invoice.countDocuments(query);
    res.json({ invoices, total });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// GET /api/invoices/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const filter = { deletedAt: null };
    const [total, paid, pending, cancelled, totalRevenue, pendingRevenue, monthlyRevenue] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.countDocuments({ ...filter, status: 'payé' }),
      Invoice.countDocuments({ ...filter, status: 'en_attente' }),
      Invoice.countDocuments({ ...filter, status: 'annulé' }),
      Invoice.aggregate([
        { $match: { status: 'payé', deletedAt: null } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'en_attente', deletedAt: null } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.aggregate([
        { $match: { status: 'payé', deletedAt: null } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, total: { $sum: '$total' } } },
        { $sort: { _id: 1 } },
        { $limit: 12 }
      ])
    ]);
    res.json({
      total, paid, pending, cancelled,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingRevenue: pendingRevenue[0]?.total || 0,
      monthlyRevenue
    });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// GET /api/invoices/:id/signature-link - Générer lien de signature
router.get('/:id/signature-link', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, deletedAt: null });
    if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await Invoice.findByIdAndUpdate(invoice._id, {
      signatureToken: token,
      signatureTokenExpiry: expiry
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.json({ signatureUrl: `${frontendUrl}/sign-invoice/${token}`, expiresAt: expiry });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// GET /api/invoices/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, deletedAt: null })
      .populate('contact').populate('contract');
    if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });
    res.json(invoice);
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// POST /api/invoices
router.post('/', protect, async (req, res) => {
  try {
    const invoice = await Invoice.create(req.body);
    log('create', invoice, req);

    if (invoice.status === 'payé') {
      await Finance.create({
        type: 'entrée',
        category: 'Facture client',
        description: `Paiement facture ${invoice.number} — ${invoice.clientName}`,
        amount: invoice.total,
        currency: invoice.currency || 'XOF',
        date: invoice.paidAt || new Date(),
        paymentMethod: 'virement',
        reference: invoice.number,
        contact: invoice.contact || null,
        invoice: invoice._id,
        notes: `Entrée automatique à la création de la facture ${invoice.number}`,
      });
    }

    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/invoices/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, deletedAt: null });
    if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });

    const oldStatus = invoice.status;
    Object.assign(invoice, req.body);
    await invoice.save();

    // ── Auto-finance: facture marquée comme payée ──────────────────────────
    if (req.body.status === 'payé' && oldStatus !== 'payé') {
      // Evite les doublons : supprimer une éventuelle entrée existante liée
      await Finance.updateMany(
        { invoice: invoice._id, deletedAt: null },
        { deletedAt: new Date() }
      );
      await Finance.create({
        type: 'entrée',
        category: 'Facture client',
        description: `Paiement facture ${invoice.number} — ${invoice.clientName}`,
        amount: invoice.total,
        currency: invoice.currency || 'XOF',
        date: invoice.paidAt || new Date(),
        paymentMethod: 'virement',
        reference: invoice.number,
        contact: invoice.contact || null,
        invoice: invoice._id,
        notes: `Entrée automatique à la validation de la facture ${invoice.number}`,
      });
    }

    // ── Auto-finance: facture dépayée (annulé / en_attente) ───────────────
    if (oldStatus === 'payé' && req.body.status && req.body.status !== 'payé') {
      await Finance.updateMany(
        { invoice: invoice._id, deletedAt: null },
        { deletedAt: new Date() }
      );
    }

    log('update', invoice, req);
    res.json(invoice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/invoices/:id - Soft delete
router.delete('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });
    res.json({ message: 'Facture supprimée' });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
