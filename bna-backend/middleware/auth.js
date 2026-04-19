const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware d'authentification
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Accès non autorisé - Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'Accès non autorisé - Utilisateur non trouvé' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Accès non autorisé - Compte désactivé' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Accès non autorisé - Token invalide' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Accès non autorisé - Token expiré' });
    }
    
    console.error('Erreur middleware auth:', error);
    res.status(500).json({ error: 'Erreur serveur d\'authentification' });
  }
};

// Middleware pour vérifier les rôles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Accès non autorisé - Permissions insuffisantes',
        required: roles,
        current: req.user.role
      });
    }
    next();
  };
};

// Middleware optionnel (n'échoue pas si pas de token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continuer sans authentification en cas d'erreur
    next();
  }
};

module.exports = { auth, authorize, optionalAuth };
