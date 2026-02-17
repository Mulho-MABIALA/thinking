const express = require('express');
const News = require('../models/News');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/news - Lister toutes les actualités (public)
router.get('/', async (req, res) => {
  try {
    const { published } = req.query;
    const query = published !== undefined ? { published: published === 'true' } : {};
    const articles = await News.find(query).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/news/:id - Détail d'une actualité (public)
router.get('/:id', async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article non trouvé' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/news - Créer une actualité (protégé)
router.post('/', protect, async (req, res) => {
  try {
    const article = await News.create(req.body);
    res.status(201).json(article);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/news/:id - Mettre à jour une actualité (protégé)
router.put('/:id', protect, async (req, res) => {
  try {
    const article = await News.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!article) return res.status(404).json({ message: 'Article non trouvé' });
    res.json(article);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/news/:id - Supprimer une actualité (protégé)
router.delete('/:id', protect, async (req, res) => {
  try {
    const article = await News.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article non trouvé' });
    res.json({ message: 'Article supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
