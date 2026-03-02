const express = require('express');
const Finance = require('../models/Finance');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/finance - Lister toutes les transactions (exclut les soft-deleted)
router.get('/', protect, async (req, res) => {
  try {
    const { type, category, startDate, endDate, limit = 100 } = req.query;
    const filter = { deletedAt: null };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const transactions = await Finance.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit))
      .populate('contact', 'name email')
      .populate('invoice', 'number')
      .populate('contract', 'number');
    res.json(transactions);
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// GET /api/finance/stats - Statistiques financières (exclut les soft-deleted)
router.get('/stats', protect, async (req, res) => {
  try {
    const { year, month } = req.query;
    const now = new Date();
    const y = Number(year) || now.getFullYear();
    const m = month !== undefined ? Number(month) : null;

    let dateFilter = {};
    if (m !== null) {
      dateFilter = {
        date: { $gte: new Date(y, m, 1), $lte: new Date(y, m + 1, 0, 23, 59, 59) }
      };
    } else {
      dateFilter = {
        date: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) }
      };
    }
    const softDeleteFilter = { deletedAt: null };

    const [entrees, sorties] = await Promise.all([
      Finance.aggregate([
        { $match: { type: 'entrée', ...dateFilter, ...softDeleteFilter } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Finance.aggregate([
        { $match: { type: 'sortie', ...dateFilter, ...softDeleteFilter } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ])
    ]);

    const totalEntrees = entrees[0]?.total || 0;
    const totalSorties = sorties[0]?.total || 0;

    const byCategory = await Finance.aggregate([
      { $match: { ...dateFilter, ...softDeleteFilter } },
      { $group: { _id: { type: '$type', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    const monthly = await Finance.aggregate([
      { $match: { date: { $gte: new Date(y, 0, 1), $lte: new Date(y, 11, 31, 23, 59, 59) }, ...softDeleteFilter } },
      {
        $group: {
          _id: { month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    res.json({
      totalEntrees, totalSorties,
      solde: totalEntrees - totalSorties,
      countEntrees: entrees[0]?.count || 0,
      countSorties: sorties[0]?.count || 0,
      byCategory, monthly
    });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// POST /api/finance - Créer une transaction
router.post('/', protect, async (req, res) => {
  try {
    const transaction = await Finance.create(req.body);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/finance/:id - Modifier une transaction
router.put('/:id', protect, async (req, res) => {
  try {
    const transaction = await Finance.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );
    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });
    res.json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/finance/:id - Soft delete
router.delete('/:id', protect, async (req, res) => {
  try {
    const transaction = await Finance.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });
    res.json({ message: 'Transaction supprimée' });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
