const express = require('express');
const Ad = require('../models/Ad');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/ads ─────────────────────────────────────────────────────────────
// Public — publicités actives (filtre optionnel ?position=)
router.get('/', async (req, res) => {
  try {
    const { position } = req.query;
    const now = new Date();

    const query = {
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: { $gte: now } },
      ],
    };

    if (position && ['home', 'blog', 'services', 'global'].includes(position)) {
      // Position exacte OU 'global' (toutes les pages)
      query.$and = [
        { $or: [{ position }, { position: 'global' }] },
      ];
      delete query.$or; // Remplacé par $and
      // Reformuler la requête proprement
      const ads = await Ad.find({
        isActive: true,
        $or: [{ position }, { position: 'global' }],
        $and: [
          {
            $or: [
              { startDate: null, endDate: null },
              { startDate: { $lte: now }, endDate: null },
              { startDate: null, endDate: { $gte: now } },
              { startDate: { $lte: now }, endDate: { $gte: now } },
            ],
          },
        ],
      }).sort({ createdAt: -1 });
      return res.json(ads);
    }

    const ads = await Ad.find(query).sort({ createdAt: -1 });
    return res.json(ads);
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── GET /api/ads/admin ───────────────────────────────────────────────────────
// Protégé — toutes les pubs + stats
router.get('/admin', protect, async (req, res) => {
  try {
    const [ads, total, active, totalClicks] = await Promise.all([
      Ad.find().sort({ createdAt: -1 }),
      Ad.countDocuments(),
      Ad.countDocuments({ isActive: true }),
      Ad.aggregate([{ $group: { _id: null, total: { $sum: '$clicks' } } }]),
    ]);

    const revenueAgg = await Ad.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$currency', total: { $sum: '$price' } } },
    ]);

    return res.json({
      ads,
      stats: {
        total,
        active,
        totalClicks: totalClicks[0]?.total || 0,
        revenue: revenueAgg,
      },
    });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── POST /api/ads ────────────────────────────────────────────────────────────
// Protégé — créer une publicité
router.post('/', protect, async (req, res) => {
  try {
    const ad = await Ad.create(req.body);
    return res.status(201).json(ad);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── PUT /api/ads/:id ─────────────────────────────────────────────────────────
// Protégé — modifier une publicité
router.put('/:id', protect, async (req, res) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ad) return res.status(404).json({ message: 'Publicité non trouvée' });
    return res.json(ad);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
    }
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── DELETE /api/ads/:id ──────────────────────────────────────────────────────
// Protégé — supprimer une publicité
router.delete('/:id', protect, async (req, res) => {
  try {
    const ad = await Ad.findByIdAndDelete(req.params.id);
    if (!ad) return res.status(404).json({ message: 'Publicité non trouvée' });
    return res.json({ message: 'Publicité supprimée' });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── POST /api/ads/:id/click ──────────────────────────────────────────────────
// Public — enregistrer un clic
router.post('/:id/click', async (req, res) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
