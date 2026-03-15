const express = require('express');
const { body } = require('express-validator');
const { Resend } = require('resend');
const multer = require('multer');
const Newsletter = require('../models/Newsletter');
const NewsletterCampaign = require('../models/NewsletterCampaign');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ─── Resend client ────────────────────────────────────────────────────────────
const getResend = () => new Resend(process.env.RESEND_API_KEY);

// ─── Multer (file attachments, memory storage) ────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ─── Email template builder ───────────────────────────────────────────────────
const buildEmailTemplate = (subject, content) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.08); }
    .header { background: #18181b; padding: 28px 32px; text-align: center; }
    .header h2 { color: #f59e0b; font-size: 20px; margin: 0; font-weight: 800; letter-spacing: -0.5px; }
    .body { padding: 32px; color: #3f3f46; font-size: 15px; line-height: 1.7; }
    .body h1, .body h2, .body h3 { color: #18181b; }
    .body a { color: #f59e0b; }
    .body ul, .body ol { padding-left: 20px; }
    .footer { background: #f4f4f5; padding: 20px 32px; text-align: center; font-size: 12px; color: #a1a1aa; }
    .footer a { color: #f59e0b; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h2>Zolaa</h2>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Zolaa — Agence digitale à Dakar</p>
      <p><a href="https://zolaa.tech">zolaa.tech</a></p>
    </div>
  </div>
</body>
</html>
`;

// ─── Validation ───────────────────────────────────────────────────────────────
const subscribeValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Adresse email invalide'),
];

// ─── POST /api/newsletter/subscribe ──────────────────────────────────────────
// Public — s'abonner à la newsletter
router.post('/subscribe', subscribeValidation, validate, async (req, res) => {
  try {
    const { email } = req.body;

    // Vérifier si déjà abonné
    const existing = await Newsletter.findOne({ email });

    if (existing) {
      if (existing.status === 'active') {
        return res.status(409).json({ message: 'Cet email est déjà abonné à la newsletter.' });
      }
      // Réactiver si précédemment désabonné
      existing.status = 'active';
      await existing.save();
      return res.status(200).json({ message: 'Abonnement réactivé avec succès.' });
    }

    await Newsletter.create({ email });
    return res.status(201).json({ message: 'Abonnement enregistré avec succès.' });
  } catch (err) {
    // Gérer la contrainte d'unicité MongoDB (race condition)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Cet email est déjà abonné à la newsletter.' });
    }
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── GET /api/newsletter/subscribers ─────────────────────────────────────────
// Protégé — lister les abonnés avec recherche + filtre + pagination
router.get('/subscribers', protect, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && ['active', 'unsubscribed'].includes(status)) {
      query.status = status;
    }
    if (search && search.trim()) {
      query.email = { $regex: search.trim(), $options: 'i' };
    }

    const [subscribers, total, active, unsubscribed] = await Promise.all([
      Newsletter.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Newsletter.countDocuments(query),
      Newsletter.countDocuments({ status: 'active' }),
      Newsletter.countDocuments({ status: 'unsubscribed' }),
    ]);

    return res.json({ subscribers, total, active, unsubscribed });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── PATCH /api/newsletter/subscribers/:id/unsubscribe ───────────────────────
// Protégé — désabonner manuellement un abonné
router.patch('/subscribers/:id/unsubscribe', protect, async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndUpdate(
      req.params.id,
      { status: 'unsubscribed' },
      { new: true }
    );
    if (!subscriber) {
      return res.status(404).json({ message: 'Abonné non trouvé' });
    }
    return res.json({ message: 'Abonné désabonné avec succès.', subscriber });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── DELETE /api/newsletter/subscribers/:id ───────────────────────────────────
// Protégé — supprimer définitivement un abonné
router.delete('/subscribers/:id', protect, async (req, res) => {
  try {
    const subscriber = await Newsletter.findByIdAndDelete(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ message: 'Abonné non trouvé' });
    }
    return res.json({ message: 'Abonné supprimé avec succès.' });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// ─── POST /api/newsletter/send ────────────────────────────────────────────────
// Protégé — envoyer une campagne email (avec sélection de destinataires + pièce jointe)
router.post(
  '/send',
  protect,
  upload.single('attachment'), // multer doit s'exécuter AVANT express-validator
  [
    body('subject').trim().notEmpty().withMessage('Sujet requis').isLength({ max: 200 }),
    body('content').trim().notEmpty().withMessage('Contenu requis'),
  ],
  validate,
  async (req, res) => {
    try {
      if (!process.env.RESEND_API_KEY) {
        return res.status(503).json({ message: 'Configuration email manquante (RESEND_API_KEY).' });
      }

      const { subject, content, recipients } = req.body;

      // ── Déterminer la liste des destinataires ──────────────────────────────
      let targetSubscribers;

      if (!recipients || recipients === 'all') {
        // Tous les abonnés actifs
        targetSubscribers = await Newsletter.find({ status: 'active' }).lean();
      } else {
        // Sélection spécifique — recipients est un tableau JSON d'emails
        try {
          const emailList = JSON.parse(recipients);
          if (!Array.isArray(emailList) || emailList.length === 0) {
            return res.status(400).json({ message: 'Aucun destinataire sélectionné.' });
          }
          targetSubscribers = await Newsletter.find({
            email: { $in: emailList },
            status: 'active',
          }).lean();
        } catch {
          return res.status(400).json({ message: 'Format des destinataires invalide.' });
        }
      }

      if (targetSubscribers.length === 0) {
        return res.status(400).json({ message: 'Aucun abonné actif parmi les destinataires.' });
      }

      // ── Créer l'entrée de campagne ─────────────────────────────────────────
      const campaign = await NewsletterCampaign.create({
        subject,
        content,
        sentTo: targetSubscribers.length,
        sentBy: req.user?.name || 'Admin',
        status: 'sending',
      });

      // ── Répondre immédiatement — l'envoi se fait en arrière-plan ──────────
      res.status(202).json({
        message: `Campagne en cours d'envoi à ${targetSubscribers.length} abonné(s).`,
        campaignId: campaign._id,
        sentTo: targetSubscribers.length,
      });

      // ── Envoi asynchrone via Resend ───────────────────────────────────────
      const resend = getResend();
      const html = buildEmailTemplate(subject, content);
      const fromAddress = process.env.RESEND_FROM || 'Zolaa <newsletter@zolaa.tech>';

      // Pièce jointe (optionnelle)
      const attachments = req.file
        ? [{ filename: req.file.originalname, content: req.file.buffer }]
        : undefined;

      let successCount = 0;
      let failCount = 0;

      for (const subscriber of targetSubscribers) {
        try {
          const { error } = await resend.emails.send({
            from: fromAddress,
            to: subscriber.email,
            subject,
            html,
            ...(attachments && { attachments }),
          });
          if (error) {
            failCount++;
            console.error(`[NEWSLETTER] ✗ Échec pour ${subscriber.email}:`, error.message);
          } else {
            successCount++;
            console.log(`[NEWSLETTER] ✓ Envoyé à ${subscriber.email}`);
          }
        } catch (mailErr) {
          failCount++;
          console.error(`[NEWSLETTER] ✗ Erreur pour ${subscriber.email}:`, mailErr.message);
        }
      }

      // ── Mettre à jour le statut de la campagne ────────────────────────────
      await NewsletterCampaign.findByIdAndUpdate(campaign._id, {
        sentSuccess: successCount,
        sentFailed: failCount,
        status: failCount === targetSubscribers.length ? 'failed' : 'sent',
      });
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// ─── GET /api/newsletter/campaigns ───────────────────────────────────────────
// Protégé — historique des campagnes
router.get('/campaigns', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const [campaigns, total] = await Promise.all([
      NewsletterCampaign.find()
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      NewsletterCampaign.countDocuments(),
    ]);
    return res.json({ campaigns, total });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
