const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/activity - Récupérer les logs (protégé)
router.get('/', protect, async (req, res) => {
  try {
    const { entity, action, page = 1, limit = 50 } = req.query;
    const query = {};
    if (entity) query.entity = entity;
    if (action) query.action = action;
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await ActivityLog.countDocuments(query);
    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// POST /api/activity - Créer un log (protégé, usage interne)
router.post('/', protect, async (req, res) => {
  try {
    const { action, entity, entityId, entityLabel, details } = req.body;
    const log = await ActivityLog.create({
      action, entity, entityId, entityLabel, details,
      user: req.user?.name || req.user?.email || 'Admin',
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/activity - Vider les logs (protégé admin)
router.delete('/', protect, async (req, res) => {
  try {
    await ActivityLog.deleteMany({});
    res.json({ message: 'Logs supprimés' });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
