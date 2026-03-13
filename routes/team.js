const express = require('express');
const Team = require('../models/Team');
const { protect } = require('../middleware/auth');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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

// POST /api/team/upload - Upload photo via Cloudinary (protégé)
router.post('/upload', protect, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Aucun fichier reçu' });
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'zolaa/team', resource_type: 'image' },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('[TEAM UPLOAD] Cloudinary error:', error);
    res.status(500).json({ message: "Erreur lors du téléversement de la photo." });
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
