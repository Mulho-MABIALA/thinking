const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Non autorisé, token manquant' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Non autorisé, compte introuvable' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Non autorisé, token invalide' });
  }
};

// Middleware admin only — à utiliser après protect
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé — droits administrateur requis' });
  }
  return next();
};

module.exports = { protect, adminOnly };
