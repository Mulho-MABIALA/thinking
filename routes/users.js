const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// All routes require: authenticated + admin role
router.use(protect, adminOnly);

// ─── GET /api/users ─── List all users ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password -twoFactorSecret').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('[USERS] GET /', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── POST /api/users ─── Create a user ───────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nom, email et mot de passe sont requis.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }
    if (!['admin', 'editor'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà.' });
    }

    const user = await User.create({ name, email, password, role: role || 'editor' });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('[USERS] POST /', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── PUT /api/users/:id ─── Update a user ────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    // Check email uniqueness if changed
    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (role && ['admin', 'editor'].includes(role)) user.role = role;

    // Only update password if provided and non-empty
    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    } else if (password && password.length > 0) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    await user.save({ validateModifiedOnly: true });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('[USERS] PUT /:id', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ─── DELETE /api/users/:id ─── Delete a user ─────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    res.json({ message: 'Utilisateur supprimé avec succès.' });
  } catch (err) {
    console.error('[USERS] DELETE /:id', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
