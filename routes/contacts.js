const express = require('express');
const { body } = require('express-validator');
const Contact = require('../models/Contact');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const router = express.Router();

// Validation rules for public contact form
const contactValidation = [
  body('name').trim().notEmpty().withMessage('Le nom est requis').isLength({ max: 100 }).withMessage('Nom trop long'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Téléphone invalide'),
  body('projectType').trim().notEmpty().withMessage('Le type de projet est requis').isLength({ max: 100 }),
  body('description').trim().notEmpty().withMessage('La description est requise').isLength({ min: 10, max: 2000 }).withMessage('Description entre 10 et 2000 caractères'),
];

// GET /api/contacts - Lister tous les contacts (protégé, exclut les soft-deleted)
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { deletedAt: null };
    if (status) query.status = status;
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    const total = await Contact.countDocuments(query);
    return res.json({ contacts, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// POST /api/contacts - Créer un contact (public - formulaire site)
router.post('/', contactValidation, validate, async (req, res) => {
  try {
    const { name, email, phone, projectType, description } = req.body;
    const contact = await Contact.create({ name, email, phone, projectType, description });
    return res.status(201).json(contact);
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// PUT /api/contacts/:id - Mettre à jour un contact (protégé)
router.put('/:id', protect, async (req, res) => {
  try {
    // Whitelist des champs autorisés (anti injection NoSQL)
    const { name, email, phone, company, subject, message, status, notes } = req.body;
    const allowedFields = { name, email, phone, company, subject, message, status, notes };
    // Retirer les champs undefined
    Object.keys(allowedFields).forEach(k => allowedFields[k] === undefined && delete allowedFields[k]);

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      allowedFields,
      { new: true, runValidators: true }
    );
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    return res.json(contact);
  } catch {
    return res.status(400).json({ message: 'Données invalides' });
  }
});

// DELETE /api/contacts/:id - Soft delete (protégé)
router.delete('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    return res.json({ message: 'Contact supprimé' });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// PUT /api/contacts/:id/restore - Restaurer un contact soft-deleted (protégé)
router.put('/:id/restore', protect, async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, deletedAt: { $ne: null } },
      { deletedAt: null },
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé ou déjà actif' });
    return res.json(contact);
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ── Notes internes ────────────────────────────────────────────────────────────

// POST /api/contacts/:id/notes - Ajouter une note interne (protégé)
router.post(
  '/:id/notes',
  protect,
  [body('text').trim().notEmpty().withMessage('Le texte est requis').isLength({ max: 1000 })],
  validate,
  async (req, res) => {
    try {
      const { text, author } = req.body;
      const contact = await Contact.findOneAndUpdate(
        { _id: req.params.id, deletedAt: null },
        { $push: { internalNotes: { text, author: author || 'Admin', createdAt: new Date() } } },
        { new: true }
      );
      if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
      return res.json(contact.internalNotes);
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// DELETE /api/contacts/:id/notes/:noteId - Supprimer une note interne (protégé)
router.delete('/:id/notes/:noteId', protect, async (req, res) => {
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { $pull: { internalNotes: { _id: req.params.noteId } } },
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    return res.json(contact.internalNotes);
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
