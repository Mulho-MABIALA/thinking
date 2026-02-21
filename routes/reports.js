const express = require('express');
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/reports — Liste tous les rapports (protégé)
router.get('/', protect, async (req, res) => {
  try {
    const { type, status, period } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (period) filter.period = period;

    const reports = await Report.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/stats — Statistiques des rapports (protégé)
router.get('/stats', protect, async (req, res) => {
  try {
    const total = await Report.countDocuments();
    const byType = await Report.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const byStatus = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const recent = await Report.find().sort({ createdAt: -1 }).limit(5).select('title type status createdAt');

    res.json({ total, byType, byStatus, recent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/reports/:id — Détail d'un rapport (protégé)
router.get('/:id', protect, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Rapport non trouvé' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/reports — Créer un rapport (protégé)
router.post('/', protect, async (req, res) => {
  try {
    const report = await Report.create(req.body);
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/reports/:id — Mettre à jour un rapport (protégé)
router.put('/:id', protect, async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!report) return res.status(404).json({ message: 'Rapport non trouvé' });
    res.json(report);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/reports/:id — Supprimer un rapport (protégé)
router.delete('/:id', protect, async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ message: 'Rapport non trouvé' });
    res.json({ message: 'Rapport supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
