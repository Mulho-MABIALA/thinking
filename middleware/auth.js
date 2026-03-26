const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'tt_session';
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Extrait le JWT depuis :
 *  1. Cookie HttpOnly `tt_session` (prioritaire — sécurisé)
 *  2. Header `Authorization: Bearer <token>` (fallback — rétrocompatibilité)
 */
const protect = async (req, res, next) => {
  let token = null;

  // 1. Cookie HttpOnly (méthode sécurisée)
  if (req.cookies?.[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }
  // 2. Authorization header (fallback)
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Non autorisé, token manquant' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Non autorisé, compte introuvable' });
    }

    req.user = user;
    return next();
  } catch {
    // Nettoyer le cookie corrompu si présent
    if (req.cookies?.[COOKIE_NAME]) {
      res.clearCookie(COOKIE_NAME);
    }
    return res.status(401).json({ message: 'Non autorisé, token invalide' });
  }
};

/**
 * Définit le cookie de session HttpOnly sur la réponse.
 * À appeler après une authentification réussie.
 */
const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,         // HTTPS uniquement en production
    sameSite: IS_PROD ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    path: '/',
  });
};

/**
 * Supprime le cookie de session.
 * À appeler lors du logout.
 */
const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
};

// Middleware admin only — à utiliser après protect
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé — droits administrateur requis' });
  }
  return next();
};

module.exports = { protect, adminOnly, setAuthCookie, clearAuthCookie };
