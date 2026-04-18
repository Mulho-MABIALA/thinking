const express = require('express');
const Contact  = require('../models/Contact');
const Contract = require('../models/Contract');
const Invoice  = require('../models/Invoice');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET /api/search?q=... - Recherche globale multi-modules (protégé)
router.get('/', protect, async (req, res) => {
  try {
    const { q = '' } = req.query;
    const term = q.trim();
    if (term.length < 2) return res.json({ contacts: [], contracts: [], invoices: [] });

    const regex = new RegExp(term, 'i');
    const base = { deletedAt: null };

    const [contacts, contracts, invoices] = await Promise.all([
      Contact.find({ ...base, $or: [{ name: regex }, { email: regex }, { projectType: regex }] })
        .select('name email projectType status createdAt readAt').limit(8),
      Contract.find({ ...base, $or: [{ clientName: regex }, { clientEmail: regex }, { number: regex }, { projectType: regex }] })
        .select('number clientName clientEmail status amount currency').limit(8),
      Invoice.find({ ...base, $or: [{ clientName: regex }, { clientEmail: regex }, { number: regex }] })
        .select('number clientName clientEmail status total currency').limit(8),
    ]);

    res.json({ contacts, contracts, invoices });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
