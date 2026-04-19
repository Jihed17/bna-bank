const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const router = express.Router();

// Middleware de validation des erreurs
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Erreur de validation',
      details: errors.array()
    });
  }
  next();
};

// Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Route d'inscription
router.post('/register', [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('email').isEmail().normalizeEmail().withMessage('Veuillez fournir un email valide'),
  body('phone').matches(/^(\+216)?[0-9]{8}$/).withMessage('Le numéro de téléphone tunisien doit contenir 8 chiffres'),
  body('cin').matches(/^[0-9]{8}$/).withMessage('Le CIN doit contenir 8 chiffres'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('dateOfBirth').isISO8601().withMessage('Veuillez fournir une date de naissance valide'),
  body('address.street').notEmpty().withMessage('L\'adresse est requise'),
  body('address.city').notEmpty().withMessage('La ville est requise'),
  body('address.zipCode').matches(/^[0-9]{4}$/).withMessage('Le code postal doit contenir 4 chiffres'),
  body('address.governorate').isIn([
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
    'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Gabès', 'Medenine', 'Tozeur', 'Kebili', 'Gafsa', 'Tataouine'
  ]).withMessage('Veuillez sélectionner un gouvernorat valide')
], handleValidationErrors, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, cin, password, dateOfBirth, address } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({
      $or: [{ email }, { cin }, { phone }]
    });

    if (existingUser) {
      let message = 'Cet utilisateur existe déjà';
      if (existingUser.email === email) message = 'Cet email est déjà utilisé';
      else if (existingUser.cin === cin) message = 'Ce CIN est déjà utilisé';
      else if (existingUser.phone === phone) message = 'Ce numéro de téléphone est déjà utilisé';

      return res.status(400).json({ error: message });
    }

    // Créer le nouvel utilisateur
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      cin,
      password,
      dateOfBirth,
      address,
      role: 'client'
    });

    await user.save();

    // Générer le token
    const token = generateToken(user._id);

    // Créer une notification de bienvenue
    await Notification.createNotification({
      recipient: user._id,
      type: 'système',
      title: 'Bienvenue sur BNA Digital',
      message: 'Votre compte a été créé avec succès. Bienvenue sur la plateforme digitale de la Banque Nationale Agricole.',
      channels: { inApp: true, email: true, sms: false, push: true },
      priority: 'moyen'
    });

    res.status(201).json({
      message: 'Compte créé avec succès',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error('Erreur d\'inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// Route de connexion
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Veuillez fournir un email valide'),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur avec le mot de passe
    const user = await User.findOne({ email }).select('+password');

    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Votre compte a été désactivé' });
    }

    // Mettre à jour la dernière connexion
    await user.updateLastLogin();

    // Générer le token
    const token = generateToken(user._id);

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

// Route de rafraîchissement du token
router.post('/refresh', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token non fourni' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Token invalide ou utilisateur inactif' });
    }

    // Générer un nouveau token
    const newToken = generateToken(user._id);

    res.json({
      message: 'Token rafraîchi',
      token: newToken
    });
  } catch (error) {
    console.error('Erreur de rafraîchissement:', error);
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
});

// Route de déconnexion
router.post('/logout', async (req, res) => {
  try {
    // Dans une implémentation réelle, on pourrait ajouter le token à une liste noire
    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Erreur de déconnexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la déconnexion' });
  }
});

// Route de demande de réinitialisation de mot de passe
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Veuillez fournir un email valide')
], handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Aucun utilisateur trouvé avec cet email' });
    }

    // Générer un token de réinitialisation
    const resetToken = Math.random().toString(36).substring(2, 15);
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 heure
    await user.save();

    // Envoyer l'email de réinitialisation (à implémenter avec nodemailer)
    console.log(`Token de réinitialisation pour ${email}: ${resetToken}`);

    res.json({
      message: 'Un email de réinitialisation a été envoyé',
      // En développement, retourner le token pour les tests
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Erreur de demande de réinitialisation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la demande de réinitialisation' });
  }
});

// Route de réinitialisation du mot de passe
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Le token de réinitialisation est requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
], handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Token invalide ou expiré' });
    }

    // Mettre à jour le mot de passe
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Créer une notification
    await Notification.createNotification({
      recipient: user._id,
      type: 'sécurité',
      title: 'Mot de passe réinitialisé',
      message: 'Votre mot de passe a été réinitialisé avec succès. Si vous n\'avez pas effectué cette action, veuillez contacter le support.',
      channels: { inApp: true, email: true, sms: false, push: true },
      priority: 'élevé'
    });

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur de réinitialisation:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la réinitialisation' });
  }
});

module.exports = router;
