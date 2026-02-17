const express = require('express');
const Contract = require('../models/Contract');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/contracts - Lister tous les contrats (protégé)
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = status ? { status } : {};
    const contracts = await Contract.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('contact', 'name email');
    const total = await Contract.countDocuments(query);
    res.json({ contracts, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/contracts/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const total = await Contract.countDocuments();
    const signed = await Contract.countDocuments({ status: 'signé' });
    const pending = await Contract.countDocuments({ status: 'envoyé' });
    const draft = await Contract.countDocuments({ status: 'brouillon' });
    const totalAmount = await Contract.aggregate([
      { $match: { status: 'signé' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    res.json({
      total, signed, pending, draft,
      totalAmount: totalAmount[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/contracts/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).populate('contact');
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });
    res.json(contract);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/contracts
router.post('/', protect, async (req, res) => {
  try {
    const contract = await Contract.create(req.body);
    res.status(201).json(contract);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/contracts/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });
    res.json(contract);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/contracts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });
    res.json({ message: 'Contrat supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
