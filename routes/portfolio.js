const express = require('express');
const Portfolio = require('../models/Portfolio');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/portfolio - Lister tous les projets (public)
router.get('/', async (req, res) => {
  try {
    const projects = await Portfolio.find().sort({ order: 1, createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/portfolio/:id - Détail d'un projet (public)
router.get('/:id', async (req, res) => {
  try {
    const project = await Portfolio.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/portfolio - Créer un projet (protégé)
router.post('/', protect, async (req, res) => {
  try {
    const project = await Portfolio.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/portfolio/:id - Mettre à jour un projet (protégé)
router.put('/:id', protect, async (req, res) => {
  try {
    const project = await Portfolio.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    res.json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/portfolio/:id - Supprimer un projet (protégé)
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Portfolio.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: 'Projet non trouvé' });
    res.json({ message: 'Projet supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
