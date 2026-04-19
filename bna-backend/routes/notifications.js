const express = require('express');
const { body, validationResult } = require('express-validator');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');
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

// Obtenir les notifications de l'utilisateur
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread = false, type } = req.query;
    const skip = (page - 1) * limit;

    let query = { recipient: req.user.id };
    
    if (unread === 'true') {
      query.status = { $in: ['envoyé', 'en_attente'] };
    }
    
    if (type) {
      query.type = type;
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
        total
      },
      unreadCount
    });
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer une notification comme lue
router.put('/:id/read', auth, async (req, res) => {
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
router.put('/read-all', auth, async (req, res) => {
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
router.delete('/:id', auth, async (req, res) => {
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
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countUnread(req.user.id);
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Erreur compteur notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Envoyer une notification (admin uniquement)
router.post('/', [
  auth,
  authorize('administrateur'),
  body('recipient').isMongoId().withMessage('ID destinataire invalide'),
  body('type').isIn([
    'rendez_vous_créé', 'rendez_vous_confirmé', 'rendez_vous_rappel',
    'rendez_vous_annulé', 'rendez_vous_reporté', 'rendez_vous_terminé',
    'message_support', 'mise_à_jour_service', 'promotion', 'sécurité', 'système'
  ]).withMessage('Type de notification invalide'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Le titre doit contenir entre 1 et 100 caractères'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Le message doit contenir entre 1 et 500 caractères'),
  body('priority').optional().isIn(['bas', 'moyen', 'élevé', 'urgent']).withMessage('Priorité invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const notificationData = req.body;

    const notification = await Notification.createNotification(notificationData);

    res.status(201).json({
      message: 'Notification envoyée avec succès',
      notification
    });
  } catch (error) {
    console.error('Erreur envoi notification:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'envoi' });
  }
});

// Envoyer une notification broadcast (admin uniquement)
router.post('/broadcast', [
  auth,
  authorize('administrateur'),
  body('type').isIn([
    'rendez_vous_créé', 'rendez_vous_confirmé', 'rendez_vous_rappel',
    'rendez_vous_annulé', 'rendez_vous_reporté', 'rendez_vous_terminé',
    'message_support', 'mise_à_jour_service', 'promotion', 'sécurité', 'système'
  ]).withMessage('Type de notification invalide'),
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Le titre doit contenir entre 1 et 100 caractères'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Le message doit contenir entre 1 et 500 caractères'),
  body('targetRole').optional().isIn(['visiteur', 'client', 'agent', 'administrateur']).withMessage('Rôle cible invalide'),
  body('priority').optional().isIn(['bas', 'moyen', 'élevé', 'urgent']).withMessage('Priorité invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const { type, title, message, targetRole, priority = 'moyen' } = req.body;

    // Obtenir la liste des destinataires
    const User = require('../models/User');
    let recipientQuery = { isActive: true };
    
    if (targetRole) {
      recipientQuery.role = targetRole;
    }

    const recipients = await User.find(recipientQuery).select('_id');

    // Créer les notifications pour tous les destinataires
    const notifications = recipients.map(recipient => ({
      recipient: recipient._id,
      type,
      title,
      message,
      channels: { inApp: true, email: true, sms: false, push: true },
      priority
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    res.status(201).json({
      message: `Notification broadcast envoyée à ${recipients.length} utilisateurs`,
      count: createdNotifications.length
    });
  } catch (error) {
    console.error('Erreur envoi broadcast:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'envoi broadcast' });
  }
});

// Obtenir les statistiques des notifications (admin uniquement)
router.get('/statistics', auth, authorize('administrateur'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    const [
      totalNotifications,
      sentNotifications,
      readNotifications,
      unreadNotifications,
      notificationsByType,
      notificationsByPriority
    ] = await Promise.all([
      Notification.countDocuments(dateFilter),
      Notification.countDocuments({ ...dateFilter, status: 'envoyé' }),
      Notification.countDocuments({ ...dateFilter, status: 'lu' }),
      Notification.countDocuments({ ...dateFilter, status: { $in: ['envoyé', 'en_attente'] } }),
      Notification.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Notification.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      statistics: {
        total: totalNotifications,
        sent: sentNotifications,
        read: readNotifications,
        unread: unreadNotifications,
        readRate: totalNotifications > 0 ? ((readNotifications / totalNotifications) * 100).toFixed(2) : 0,
        byType: notificationsByType,
        byPriority: notificationsByPriority
      }
    });
  } catch (error) {
    console.error('Erreur statistiques notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
