const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { Resend } = require('resend');
const User = require('../models/User');
const { protect, setAuthCookie, clearAuthCookie } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const router = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY);

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Temporary token for 2FA pending state (5 minutes)
const generateTempToken = (id) => {
  return jwt.sign({ id, type: '2fa_pending' }, process.env.JWT_SECRET, { expiresIn: '5m' });
};

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      // Unified error to prevent user enumeration attacks
      if (!user || !(await user.matchPassword(password))) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
      }

      // If 2FA is enabled, return a temporary token for the second step
      if (user.twoFactorEnabled) {
        return res.json({
          requiresTwoFactor: true,
          tempToken: generateTempToken(user._id),
        });
      }

      const token = generateToken(user._id);
      setAuthCookie(res, token);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled,
        hasGoogleAccount: !!user.googleId,
        createdAt: user.createdAt,
        token, // Conservé pour rétrocompatibilité frontend
      });
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// POST /api/auth/2fa/login - Valider le code TOTP et obtenir un token complet
router.post(
  '/2fa/login',
  [
    body('tempToken').notEmpty().withMessage('Token temporaire requis'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code à 6 chiffres requis'),
  ],
  validate,
  async (req, res) => {
    try {
      const { tempToken, code } = req.body;

      let decoded;
      try {
        decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({ message: 'Token temporaire invalide ou expiré' });
      }

      if (decoded.type !== '2fa_pending') {
        return res.status(401).json({ message: 'Token invalide' });
      }

      const user = await User.findById(decoded.id).select('+twoFactorSecret');
      if (!user || !user.twoFactorEnabled) {
        return res.status(401).json({ message: 'Authentification invalide' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 1, // ±30 secondes de tolérance
      });

      if (!verified) {
        return res.status(401).json({ message: 'Code incorrect. Réessayez.' });
      }

      const token = generateToken(user._id);
      setAuthCookie(res, token);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled,
        hasGoogleAccount: !!user.googleId,
        createdAt: user.createdAt,
        token,
      });
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// POST /api/auth/google
router.post(
  '/google',
  [body('credential').notEmpty().withMessage('Credential Google requis')],
  validate,
  async (req, res) => {
    try {
      const { credential } = req.body;

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { sub: googleId, email, picture } = payload;

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(403).json({ message: "Accès refusé. Ce compte Google n'est pas autorisé." });
      }

      if (!user.googleId) {
        user.googleId = googleId;
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      }

      const token = generateToken(user._id);
      setAuthCookie(res, token);
      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled,
        hasGoogleAccount: true,
        createdAt: user.createdAt,
        token,
      });
    } catch {
      return res.status(401).json({ message: 'Authentification Google invalide' });
    }
  }
);

// POST /api/auth/logout — Invalide le cookie de session
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ message: 'Déconnecté avec succès' });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const u = req.user;
  res.json({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatar: u.avatar,
    twoFactorEnabled: u.twoFactorEnabled,
    hasGoogleAccount: !!u.googleId,
    createdAt: u.createdAt,
  });
});

// PUT /api/auth/profile - Mettre à jour nom et avatar
router.put(
  '/profile',
  protect,
  [
    body('name').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
    body('avatar').optional().trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, avatar } = req.body;
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (avatar !== undefined) updateData.avatar = avatar;

      const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        twoFactorEnabled: user.twoFactorEnabled,
        hasGoogleAccount: !!user.googleId,
        createdAt: user.createdAt,
      });
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// PUT /api/auth/password - Changer le mot de passe
router.put(
  '/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword').isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit faire au moins 8 caractères'),
  ],
  validate,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select('+password');

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur introuvable' });
      }

      if (!user.password) {
        return res.status(400).json({ message: 'Ce compte utilise uniquement Google OAuth. Définissez un mot de passe initial autrement.' });
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
      }

      user.password = newPassword;
      await user.save(); // déclenche le hook bcrypt pre-save

      return res.json({ message: 'Mot de passe mis à jour avec succès' });
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// POST /api/auth/forgot-password — Envoyer un email de réinitialisation
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Email invalide')],
  validate,
  async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });

      // Réponse générique pour éviter l'énumération d'utilisateurs
      if (!user || !user.password) {
        return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
      }

      // Générer un token sécurisé (1h d'expiration)
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000);

      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken: token,
        resetPasswordExpiry: expiry
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@zolaa.tech',
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe — Zolaa',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #09090b; font-size: 20px; margin-bottom: 16px;">Réinitialisation de mot de passe</h2>
            <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
              Bonjour ${user.name},<br><br>
              Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau. Ce lien expire dans <strong>1 heure</strong>.
            </p>
            <a href="${resetUrl}" style="display: inline-block; background: #f59e0b; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px;">
              Réinitialiser le mot de passe
            </a>
            <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe ne sera pas modifié.
            </p>
          </div>
        `,
      });

      return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
    } catch (err) {
      console.error('[FORGOT-PASSWORD]', err);
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// POST /api/auth/reset-password — Réinitialiser le mot de passe via token
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token requis'),
    body('newPassword').isLength({ min: 8 }).withMessage('Le mot de passe doit faire au moins 8 caractères'),
  ],
  validate,
  async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: new Date() },
      }).select('+resetPasswordToken +resetPasswordExpiry');

      if (!user) {
        return res.status(400).json({ message: 'Lien invalide ou expiré. Demandez un nouveau lien.' });
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();

      return res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' });
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// PUT /api/auth/email - Changer l'email de connexion
router.put(
  '/email',
  protect,
  [
    body('newEmail').isEmail().normalizeEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis pour confirmer'),
  ],
  validate,
  async (req, res) => {
    try {
      const { newEmail, password } = req.body;

      const user = await User.findById(req.user._id).select('+password');
      if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

      if (!user.password) {
        return res.status(400).json({ message: 'Ce compte utilise Google OAuth. Le changement d\'email n\'est pas disponible.' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) return res.status(400).json({ message: 'Mot de passe incorrect' });

      const existing = await User.findOne({ email: newEmail });
      if (existing) return res.status(409).json({ message: 'Cet email est déjà utilisé' });

      user.email = newEmail;
      await user.save();

      return res.json({ message: 'Email mis à jour avec succès', email: user.email });
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// ── 2FA Management (routes protégées) ────────────────────────────────────────

// POST /api/auth/2fa/setup - Générer secret + QR code (ne l'active pas encore)
router.post('/2fa/setup', protect, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Thinking Tech (${req.user.email})`,
      length: 20,
    });

    // Stocker le secret temporairement (non encore activé)
    await User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret.base32 });

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url);

    return res.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      otpauthUrl: secret.otpauth_url,
    });
  } catch {
    return res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// POST /api/auth/2fa/verify - Vérifier le premier code et activer la 2FA
router.post(
  '/2fa/verify',
  protect,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Code à 6 chiffres requis')],
  validate,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('+twoFactorSecret');
      if (!user?.twoFactorSecret) {
        return res.status(400).json({ message: 'Configurez d\'abord la 2FA via /setup' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: req.body.code,
        window: 1,
      });

      if (!verified) {
        return res.status(400).json({ message: 'Code incorrect. Scannez à nouveau le QR code.' });
      }

      await User.findByIdAndUpdate(req.user._id, { twoFactorEnabled: true });
      return res.json({ message: '2FA activée avec succès' });
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

// POST /api/auth/2fa/disable - Désactiver la 2FA (requiert un code valide)
router.post(
  '/2fa/disable',
  protect,
  [body('code').isLength({ min: 6, max: 6 }).withMessage('Code à 6 chiffres requis')],
  validate,
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('+twoFactorSecret');
      if (!user?.twoFactorEnabled) {
        return res.status(400).json({ message: 'La 2FA n\'est pas activée' });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: req.body.code,
        window: 1,
      });

      if (!verified) {
        return res.status(400).json({ message: 'Code incorrect' });
      }

      await User.findByIdAndUpdate(req.user._id, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      });
      return res.json({ message: '2FA désactivée' });
    } catch {
      return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
);

module.exports = router;
