const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');
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

// Obtenir le profil de l'utilisateur connecté
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-passwordResetToken -passwordResetExpires -emailVerificationToken');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Erreur profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour le profil
router.put('/profile', auth, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caractères'),
  body('phone').optional().matches(/^(\+216)?[0-9]{8}$/).withMessage('Le numéro de téléphone tunisien doit contenir 8 chiffres'),
  body('address.street').optional().notEmpty().withMessage('L\'adresse est requise'),
  body('address.city').optional().notEmpty().withMessage('La ville est requise'),
  body('address.zipCode').optional().matches(/^[0-9]{4}$/).withMessage('Le code postal doit contenir 4 chiffres'),
  body('address.governorate').optional().isIn([
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
    'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Gabès', 'Medenine', 'Tozeur', 'Kebili', 'Gafsa', 'Tataouine'
  ]).withMessage('Veuillez sélectionner un gouvernorat valide')
], handleValidationErrors, async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordResetToken -passwordResetExpires -emailVerificationToken');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      message: 'Profil mis à jour avec succès',
      user
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});

// Changer le mot de passe
router.put('/password', auth, [
  body('currentPassword').notEmpty().withMessage('Le mot de passe actuel est requis'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
], handleValidationErrors, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier le mot de passe actuel
    if (!await user.comparePassword(currentPassword)) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    // Créer une notification de sécurité
    await Notification.createNotification({
      recipient: user._id,
      type: 'sécurité',
      title: 'Mot de passe modifié',
      message: 'Votre mot de passe a été modifié avec succès. Si vous n\'avez pas effectué cette action, veuillez contacter le support.',
      channels: { inApp: true, email: true, sms: false, push: true },
      priority: 'élevé'
    });

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur lors du changement de mot de passe' });
  }
});

// Mettre à jour les préférences
router.put('/preferences', auth, [
  body('language').optional().isIn(['fr', 'ar']).withMessage('La langue doit être fr ou ar'),
  body('notifications.email').optional().isBoolean().withMessage('Doit être un booléen'),
  body('notifications.sms').optional().isBoolean().withMessage('Doit être un booléen'),
  body('notifications.push').optional().isBoolean().withMessage('Doit être un booléen')
], handleValidationErrors, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { preferences: req.body } },
      { new: true, runValidators: true }
    ).select('-passwordResetToken -passwordResetExpires -emailVerificationToken');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      message: 'Préférences mises à jour avec succès',
      user
    });
  } catch (error) {
    console.error('Erreur mise à jour préférences:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});

// Obtenir les notifications de l'utilisateur
router.get('/notifications', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread = false } = req.query;
    const skip = (page - 1) * limit;

    let query = { recipient: req.user.id };
    if (unread === 'true') {
      query.status = { $in: ['envoyé', 'en_attente'] };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('data.appointmentId', 'dateTime status')
      .populate('data.agencyId', 'name address.city')
      .populate('data.serviceId', 'name');

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countUnread(req.user.id);

    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: notifications.length,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Erreur notifications:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des notifications' });
  }
});

// Marquer une notification comme lue
router.put('/notifications/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    await notification.markAsRead();

    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error('Erreur marquer notification lue:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer toutes les notifications comme lues
router.put('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, status: { $in: ['envoyé', 'en_attente'] } },
      { 
        status: 'lu',
        readAt: new Date()
      }
    );

    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    console.error('Erreur marquer toutes notifications lues:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une notification
router.delete('/notifications/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    res.json({ message: 'Notification supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir le nombre de notifications non lues
router.get('/notifications/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countUnread(req.user.id);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Erreur compteur notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques de l'utilisateur (pour les agents et admins)
router.get('/statistics', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!['agent', 'administrateur'].includes(user.role)) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Statistiques à implémenter selon le rôle
    const statistics = {
      totalAppointments: 0,
      completedAppointments: 0,
      averageRating: 0,
      // ... autres statistiques
    };

    res.json({ statistics });
  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
