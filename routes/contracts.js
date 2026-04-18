const express = require('express');
const crypto = require('crypto');
const Contract = require('../models/Contract');
const ActivityLog = require('../models/ActivityLog');
const { protect } = require('../middleware/auth');
const router = express.Router();

const log = (action, contract, req) => ActivityLog.create({
  action, entity: 'contract',
  entityId: contract._id?.toString(),
  entityLabel: contract.number || contract.clientName,
  user: req.user?.name || req.user?.email || 'Admin',
  ip: req.ip || req.headers['x-forwarded-for'],
}).catch(() => {});

// ── Routes publiques (signature) ─ AVANT les routes protégées ────────────────

// GET /api/contracts/sign/:token - Récupérer un contrat pour signature (public)
router.get('/sign/:token', async (req, res) => {
  try {
    const contract = await Contract.findOne({
      signatureToken: req.params.token,
      signatureTokenExpiry: { $gt: new Date() },
      deletedAt: null
    }).select('-signatureToken -signatureTokenExpiry');

    if (!contract) {
      return res.status(404).json({ message: 'Lien de signature invalide ou expiré' });
    }
    if (contract.signedAt) {
      return res.status(400).json({ message: 'Ce contrat a déjà été signé', signedAt: contract.signedAt });
    }
    return res.json(contract);
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// POST /api/contracts/sign/:token - Signer un contrat (public)
router.post('/sign/:token', async (req, res) => {
  try {
    const contract = await Contract.findOne({
      signatureToken: req.params.token,
      signatureTokenExpiry: { $gt: new Date() },
      deletedAt: null
    });

    if (!contract) {
      return res.status(404).json({ message: 'Lien de signature invalide ou expiré' });
    }
    if (contract.signedAt) {
      return res.status(400).json({ message: 'Ce contrat a déjà été signé' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    contract.signedAt = new Date();
    contract.status = 'signé';
    contract.signatureIp = String(ip).split(',')[0].trim();
    contract.signatureData = req.body.signatureData || null;
    // Invalider le token après utilisation
    contract.signatureToken = null;
    contract.signatureTokenExpiry = null;
    await contract.save();

    return res.json({ message: 'Contrat signé avec succès', signedAt: contract.signedAt });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ── Routes protégées ──────────────────────────────────────────────────────────

// GET /api/contracts - Lister tous les contrats (exclut les soft-deleted)
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const query = { deletedAt: null };
    if (status) query.status = status;
    const contracts = await Contract.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('contact', 'name email');
    const total = await Contract.countDocuments(query);
    res.json({ contracts, total });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// GET /api/contracts/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const filter = { deletedAt: null };
    const [total, signed, pending, draft, totalAmount] = await Promise.all([
      Contract.countDocuments(filter),
      Contract.countDocuments({ ...filter, status: 'signé' }),
      Contract.countDocuments({ ...filter, status: 'envoyé' }),
      Contract.countDocuments({ ...filter, status: 'brouillon' }),
      Contract.aggregate([
        { $match: { status: 'signé', deletedAt: null } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);
    res.json({ total, signed, pending, draft, totalAmount: totalAmount[0]?.total || 0 });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// GET /api/contracts/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const contract = await Contract.findOne({ _id: req.params.id, deletedAt: null }).populate('contact');
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });
    res.json(contract);
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// POST /api/contracts
router.post('/', protect, async (req, res) => {
  try {
    const contract = await Contract.create(req.body);
    res.status(201).json(contract);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/contracts/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const contract = await Contract.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true, runValidators: true }
    );
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });
    res.json(contract);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/contracts/:id - Soft delete
router.delete('/:id', protect, async (req, res) => {
  try {
    const contract = await Contract.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });
    res.json({ message: 'Contrat supprimé' });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// POST /api/contracts/:id/send-signature - Générer un lien de signature (protégé)
router.post('/:id/send-signature', protect, async (req, res) => {
  try {
    const contract = await Contract.findOne({ _id: req.params.id, deletedAt: null });
    if (!contract) return res.status(404).json({ message: 'Contrat non trouvé' });

    // Génération d'un token sécurisé (48h d'expiration)
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await Contract.findByIdAndUpdate(contract._id, {
      signatureToken: token,
      signatureTokenExpiry: expiry
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const signatureUrl = `${frontendUrl}/sign/${token}`;

    res.json({ signatureUrl, expiresAt: expiry });
  } catch {
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
