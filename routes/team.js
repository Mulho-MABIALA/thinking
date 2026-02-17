const express = require('express');
const Team = require('../models/Team');
const { protect } = require('../middleware/auth');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Config multer pour les photos de l'équipe
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/team');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `team-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées'));
  }
});

// GET /api/team - Lister tous les membres (public)
router.get('/', async (req, res) => {
  try {
    const members = await Team.find().sort({ order: 1, createdAt: -1 });
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/team/upload - Upload photo (protégé)
router.post('/upload', protect, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });
    const url = `${req.protocol}://${req.get('host')}/uploads/team/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/team - Ajouter un membre (protégé)
router.post('/', protect, async (req, res) => {
  try {
    const member = await Team.create(req.body);
    res.status(201).json(member);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/team/:id - Mettre à jour un membre (protégé)
router.put('/:id', protect, async (req, res) => {
  try {
    const member = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!member) return res.status(404).json({ message: 'Membre non trouvé' });
    res.json(member);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/team/:id - Supprimer un membre (protégé)
router.delete('/:id', protect, async (req, res) => {
  try {
    const member = await Team.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ message: 'Membre non trouvé' });
    res.json({ message: 'Membre supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
