const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const router = express.Router();

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

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        token: generateToken(user._id),
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

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        token: generateToken(user._id),
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
        if (picture) user.avatar = picture;
        await user.save();
      }

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        token: generateToken(user._id),
      });
    } catch {
      return res.status(401).json({ message: 'Authentification Google invalide' });
    }
  }
);

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json(req.user);
});

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
