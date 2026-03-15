const express = require('express');
const { body } = require('express-validator');
const nodemailer = require('nodemailer');
const Newsletter = require('../models/Newsletter');
const NewsletterCampaign = require('../models/NewsletterCampaign');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ─── Nodemailer transporter ───────────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
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
    .header img { height: 36px; }
    .header h2 { color: #f59e0b; font-size: 20px; margin: 12px 0 0; font-weight: 800; letter-spacing: -0.5px; }
    .body { padding: 32px; color: #3f3f46; font-size: 15px; line-height: 1.7; }
    .body h1, .body h2, .body h3 { color: #18181b; }
    .footer { background: #f4f4f5; padding: 20px 32px; text-align: center; font-size: 12px; color: #a1a1aa; }
    .footer a { color: #f59e0b; text-decoration: none; }
    .unsubscribe { margin-top: 12px; font-size: 11px; color: #d4d4d8; }
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
// Protégé — envoyer une campagne email à tous les abonnés actifs
router.post(
  '/send',
  protect,
  [
    body('subject').trim().notEmpty().withMessage('Sujet requis').isLength({ max: 200 }),
    body('content').trim().notEmpty().withMessage('Contenu requis'),
  ],
  validate,
  async (req, res) => {
    try {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return res.status(503).json({ message: 'Configuration email manquante (GMAIL_USER / GMAIL_APP_PASSWORD).' });
      }

      const { subject, content } = req.body;

      // Récupérer tous les abonnés actifs
      const activeSubscribers = await Newsletter.find({ status: 'active' }).lean();

      if (activeSubscribers.length === 0) {
        return res.status(400).json({ message: 'Aucun abonné actif.' });
      }

      // Créer l'entrée de campagne
      const campaign = await NewsletterCampaign.create({
        subject,
        content,
        sentTo: activeSubscribers.length,
        sentBy: req.user?.name || 'Admin',
        status: 'sending',
      });

      // Répondre immédiatement — l'envoi se fait en arrière-plan
      res.status(202).json({
        message: `Campagne en cours d'envoi à ${activeSubscribers.length} abonné(s).`,
        campaignId: campaign._id,
        sentTo: activeSubscribers.length,
      });

      // ── Envoi asynchrone ──────────────────────────────────────────────────
      const transporter = createTransporter();

      // Vérifier la connexion SMTP avant d'envoyer
      try {
        await transporter.verify();
        console.log('[NEWSLETTER] Connexion SMTP Gmail OK');
      } catch (verifyErr) {
        console.error('[NEWSLETTER] Erreur connexion SMTP:', verifyErr.message);
        await NewsletterCampaign.findByIdAndUpdate(campaign._id, {
          status: 'failed',
          sentSuccess: 0,
          sentFailed: activeSubscribers.length,
        });
        return;
      }

      const html = buildEmailTemplate(subject, content);

      let successCount = 0;
      let failCount = 0;

      for (const subscriber of activeSubscribers) {
        try {
          await transporter.sendMail({
            from: `"Zolaa" <${process.env.GMAIL_USER}>`,
            to: subscriber.email,
            subject,
            html,
          });
          successCount++;
          console.log(`[NEWSLETTER] ✓ Envoyé à ${subscriber.email}`);
        } catch (mailErr) {
          failCount++;
          console.error(`[NEWSLETTER] ✗ Échec pour ${subscriber.email}:`, mailErr.message);
        }
      }

      // Mettre à jour le statut de la campagne
      await NewsletterCampaign.findByIdAndUpdate(campaign._id, {
        sentSuccess: successCount,
        sentFailed: failCount,
        status: failCount === activeSubscribers.length ? 'failed' : 'sent',
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
