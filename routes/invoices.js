const express = require('express');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');
const router = express.Router();

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
    const total = await Invoice.countDocuments(filter);
    const paid = await Invoice.countDocuments({ ...filter, status: 'payé' });
    const pending = await Invoice.countDocuments({ ...filter, status: 'en_attente' });
    const cancelled = await Invoice.countDocuments({ ...filter, status: 'annulé' });
    const totalRevenue = await Invoice.aggregate([
      { $match: { status: 'payé', deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const pendingRevenue = await Invoice.aggregate([
      { $match: { status: 'en_attente', deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const monthlyRevenue = await Invoice.aggregate([
      { $match: { status: 'payé', deletedAt: null } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, total: { $sum: '$total' } } },
      { $sort: { _id: 1 } },
      { $limit: 12 }
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
    Object.assign(invoice, req.body);
    await invoice.save();
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
