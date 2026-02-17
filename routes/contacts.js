const express = require('express');
const Contact = require('../models/Contact');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/contacts - Lister tous les contacts (protégé)
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Contact.countDocuments(query);
    res.json({ contacts, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/contacts - Créer un contact (public - formulaire site)
router.post('/', async (req, res) => {
  try {
    const contact = await Contact.create(req.body);
    res.status(201).json(contact);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/contacts/:id - Mettre à jour un contact (protégé)
router.put('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    res.json(contact);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/contacts/:id - Supprimer un contact (protégé)
router.delete('/:id', protect, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact non trouvé' });
    res.json({ message: 'Contact supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
