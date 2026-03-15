const express = require('express');
const { body } = require('express-validator');
const Newsletter = require('../models/Newsletter');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ─── Validation ───────────────────────────────────────────────────────────────
const subscribeValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email invalide'),
];

// ─── POST /api/newsletter/subscribe ──────────────────────────────────────────
// Public — s'abonner à la newsletter
router.post('/subscribe', subscribeValidation, validate, async (req, res) => {
  try {
    const { email } = req.body;

    // Vérifier si déjà abonné
    const existing = await Newsletter.findOne({ email });

    if (existing) {
      if (existing.status === 'active') {
        return res.status(409).json({ message: 'Cet email est déjà abonné à la newsletter.' });
      }
      // Réactiver si précédemment désabonné
      existing.status = 'active';
      await existing.save();
      return res.status(200).json({ message: 'Abonnement réactivé avec succès.' });
    }

    await Newsletter.create({ email });
    return res.status(201).json({ message: 'Abonnement enregistré avec succès.' });
  } catch (err) {
    // Gérer la contrainte d'unicité MongoDB (race condition)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Cet email est déjà abonné à la newsletter.' });
    }
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── GET /api/newsletter/subscribers ─────────────────────────────────────────
// Protégé — lister les abonnés avec recherche + filtre + pagination
router.get('/subscribers', protect, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && ['active', 'unsubscribed'].includes(status)) {
      query.status = status;
    }
    if (search && search.trim()) {
      query.email = { $regex: search.trim(), $options: 'i' };
    }

    const [subscribers, total, active, unsubscribed] = await Promise.all([
      Newsletter.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Newsletter.countDocuments(query),
      Newsletter.countDocuments({ status: 'active' }),
      Newsletter.countDocuments({ status: 'unsubscribed' }),
    ]);

    return res.json({ subscribers, total, active, unsubscribed });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── PATCH /api/newsletter/subscribers/:id/unsubscribe ───────────────────────
// Protégé — désabonner manuellement un abonné
router.patch('/subscribers/:id/unsubscribe', protect, async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndUpdate(
      req.params.id,
      { status: 'unsubscribed' },
      { new: true }
    );
    if (!subscriber) {
      return res.status(404).json({ message: 'Abonné non trouvé' });
    }
    return res.json({ message: 'Abonné désabonné avec succès.', subscriber });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── DELETE /api/newsletter/subscribers/:id ───────────────────────────────────
// Protégé — supprimer définitivement un abonné
router.delete('/subscribers/:id', protect, async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ message: 'Abonné non trouvé' });
    }
    return res.json({ message: 'Abonné supprimé avec succès.' });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
