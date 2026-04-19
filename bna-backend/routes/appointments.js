const express = require('express');
const { body, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const Agency = require('../models/Agency');
const Service = require('../models/Service');
const User = require('../models/User');
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

// Helper pour formater la date
const formatDateTime = (dateTime) => {
  const date = new Date(dateTime);
  return date.toISOString();
};

// Obtenir les rendez-vous de l'utilisateur connecté
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    let query = { client: req.user.id };

    // Filtrer par statut
    if (status) {
      query.status = status;
    }

    // Filtrer par plage de dates
    if (startDate || endDate) {
      query.dateTime = {};
      if (startDate) {
        query.dateTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.dateTime.$lte = new Date(endDate);
      }
    }

    const appointments = await Appointment.find(query)
      .populate('agency', 'name address.city address.governorate')
      .populate('service', 'name category duration')
      .populate('agent', 'firstName lastName')
      .sort({ dateTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: appointments.length,
        total
      }
    });
  } catch (error) {
    console.error('Erreur récupération rendez-vous:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les rendez-vous pour les agents
router.get('/agent', auth, authorize('agent', 'administrateur'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date } = req.query;
    const skip = (page - 1) * limit;

    let query = { agent: req.user.id };

    // Filtrer par statut
    if (status) {
      query.status = status;
    }

    // Filtrer par date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.dateTime = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const appointments = await Appointment.find(query)
      .populate('client', 'firstName lastName email phone')
      .populate('agency', 'name')
      .populate('service', 'name category duration')
      .sort({ dateTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Appointment.countDocuments(query);

    res.json({
      appointments,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: appointments.length,
        total
      }
    });
  } catch (error) {
    console.error('Erreur récupération rendez-vous agent:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un rendez-vous spécifique
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('agency', 'name address.city address.governorate contact.phone')
      .populate('service', 'name category duration requirements documents fees')
      .populate('agent', 'firstName lastName email')
      .populate('client', 'firstName lastName email phone');

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    // Vérifier les permissions
    const isOwner = appointment.client._id.toString() === req.user.id;
    const isAgent = appointment.agent?._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'administrateur';

    if (!isOwner && !isAgent && !isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    res.json({ appointment });
  } catch (error) {
    console.error('Erreur récupération rendez-vous:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un nouveau rendez-vous
router.post('/', [
  auth,
  body('agency').isMongoId().withMessage('ID d\'agence invalide'),
  body('service').isMongoId().withMessage('ID de service invalide'),
  body('dateTime').isISO8601().withMessage('Date et heure invalides'),
  body('duration').isInt({ min: 5, max: 480 }).withMessage('La durée doit être entre 5 et 480 minutes'),
  body('notes.client').optional().isString().isLength({ max: 500 }).withMessage('Les notes ne peuvent pas dépasser 500 caractères'),
  body('priority').optional().isIn(['bas', 'normal', 'élevé', 'urgent']).withMessage('Priorité invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const { agency, service, dateTime, duration, notes, priority } = req.body;

    // Vérifier que l'agence et le service existent
    const [agencyDoc, serviceDoc] = await Promise.all([
      Agency.findById(agency),
      Service.findById(service)
    ]);

    if (!agencyDoc) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    if (!serviceDoc) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    // Vérifier que le service est disponible dans cette agence
    if (!agencyDoc.services.includes(service)) {
      return res.status(400).json({ error: 'Ce service n\'est pas disponible dans cette agence' });
    }

    // Vérifier que l'agence est ouverte à cette date/heure
    const appointmentDate = new Date(dateTime);
    const dayOfWeek = appointmentDate.getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayHours = agencyDoc.openingHours[days[dayOfWeek]];

    if (dayHours.closed) {
      return res.status(400).json({ error: 'L\'agence est fermée à cette date' });
    }

    const appointmentTime = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
    const [openHour, openMin] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = dayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;

    if (appointmentTime < openTime || appointmentTime >= closeTime) {
      return res.status(400).json({ error: 'L\'heure du rendez-vous est en dehors des heures d\'ouverture' });
    }

    // Vérifier les conflits de rendez-vous
    const conflictingAppointments = await Appointment.checkAvailability(
      agency,
      null, // Pas d'agent spécifique pour le moment
      dateTime,
      duration
    );

    if (conflictingAppointments.length > 0) {
      return res.status(400).json({ 
        error: 'Ce créneau n\'est plus disponible',
        availableSlots: await getAvailableSlots(agency, appointmentDate, serviceDoc.duration)
      });
    }

    // Vérifier la capacité de l'agence
    const dayStart = new Date(appointmentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(appointmentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dailyAppointments = await Appointment.countDocuments({
      agency,
      dateTime: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['confirmé', 'en_cours'] }
    });

    if (dailyAppointments >= agencyDoc.capacity.dailyAppointments) {
      return res.status(400).json({ error: 'Capacité maximale de l\'agence atteinte pour cette journée' });
    }

    // Créer le rendez-vous
    const appointment = new Appointment({
      client: req.user.id,
      agency,
      service,
      dateTime: appointmentDate,
      duration,
      notes,
      priority: priority || 'normal'
    });

    await appointment.save();

    // Mettre à jour les statistiques
    await Promise.all([
      agencyDoc.incrementAppointments(),
      serviceDoc.incrementAppointments()
    ]);

    // Créer les notifications
    await Notification.createNotification({
      recipient: req.user.id,
      type: 'rendez_vous_créé',
      title: 'Rendez-vous confirmé',
      message: `Votre rendez-vous pour ${serviceDoc.name} le ${appointmentDate.toLocaleDateString('fr-FR')} à ${appointmentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} a été confirmé.`,
      data: {
        appointmentId: appointment._id,
        agencyId: agency,
        serviceId: service,
        actionUrl: `/appointments/${appointment._id}`,
        actionText: 'Voir les détails'
      },
      channels: { inApp: true, email: true, sms: false, push: true },
      priority: 'moyen'
    });

    // Notifier les agents de l'agence
    const agents = await User.find({ 
      role: 'agent',
      'staff.agency': agency,
      isActive: true
    });

    for (const agent of agents) {
      await Notification.createNotification({
        recipient: agent._id,
        type: 'rendez_vous_créé',
        title: 'Nouveau rendez-vous',
        message: `Un nouveau rendez-vous pour ${serviceDoc.name} a été programmé le ${appointmentDate.toLocaleDateString('fr-FR')} à ${appointmentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
        data: {
          appointmentId: appointment._id,
          agencyId: agency,
          serviceId: service,
          actionUrl: `/dashboard/appointments/${appointment._id}`,
          actionText: 'Voir les détails'
        },
        channels: { inApp: true, email: false, sms: false, push: true },
        priority: 'normal'
      });
    }

    res.status(201).json({
      message: 'Rendez-vous créé avec succès',
      appointment: await Appointment.findById(appointment._id)
        .populate('agency', 'name address.city')
        .populate('service', 'name category duration')
    });
  } catch (error) {
    console.error('Erreur création rendez-vous:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création du rendez-vous' });
  }
});

// Mettre à jour un rendez-vous
router.put('/:id', [
  auth,
  body('dateTime').optional().isISO8601().withMessage('Date et heure invalides'),
  body('duration').optional().isInt({ min: 5, max: 480 }).withMessage('La durée doit être entre 5 et 480 minutes'),
  body('notes.client').optional().isString().isLength({ max: 500 }).withMessage('Les notes ne peuvent pas dépasser 500 caractères'),
  body('priority').optional().isIn(['bas', 'normal', 'élevé', 'urgent']).withMessage('Priorité invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    // Vérifier les permissions
    const isOwner = appointment.client.toString() === req.user.id;
    const isAdmin = req.user.role === 'administrateur';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Vérifier que le rendez-vous peut être modifié
    if (['en_cours', 'terminé'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Ce rendez-vous ne peut plus être modifié' });
    }

    const updates = req.body;
    const oldDateTime = appointment.dateTime;

    // Si la date/heure est modifiée, vérifier la disponibilité
    if (updates.dateTime && updates.dateTime !== oldDateTime) {
      const conflictingAppointments = await Appointment.checkAvailability(
        appointment.agency,
        appointment.agent,
        updates.dateTime,
        updates.duration || appointment.duration,
        appointment._id
      );

      if (conflictingAppointments.length > 0) {
        return res.status(400).json({ 
          error: 'Ce créneau n\'est plus disponible',
          availableSlots: await getAvailableSlots(appointment.agency, new Date(updates.dateTime), updates.duration || appointment.duration)
        });
      }
    }

    // Appliquer les mises à jour
    Object.assign(appointment, updates);
    await appointment.save();

    // Notifier le client si la date a changé
    if (updates.dateTime && updates.dateTime !== oldDateTime) {
      await Notification.createNotification({
        recipient: appointment.client,
        type: 'rendez_vous_reporté',
        title: 'Rendez-vous modifié',
        message: `Votre rendez-vous a été modifié au ${new Date(updates.dateTime).toLocaleDateString('fr-FR')} à ${new Date(updates.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
        data: {
          appointmentId: appointment._id,
          actionUrl: `/appointments/${appointment._id}`,
          actionText: 'Voir les détails'
        },
        channels: { inApp: true, email: true, sms: false, push: true },
        priority: 'élevé'
      });
    }

    res.json({
      message: 'Rendez-vous mis à jour avec succès',
      appointment: await Appointment.findById(appointment._id)
        .populate('agency', 'name address.city')
        .populate('service', 'name category duration')
        .populate('agent', 'firstName lastName')
    });
  } catch (error) {
    console.error('Erreur mise à jour rendez-vous:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});

// Annuler un rendez-vous
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    // Vérifier les permissions
    const isOwner = appointment.client.toString() === req.user.id;
    const isAgent = appointment.agent?.toString() === req.user.id;
    const isAdmin = req.user.role === 'administrateur';

    if (!isOwner && !isAgent && !isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    // Vérifier que le rendez-vous peut être annulé
    if (['terminé'].includes(appointment.status)) {
      return res.status(400).json({ error: 'Ce rendez-vous ne peut plus être annulé' });
    }

    const { reason } = req.body;
    await appointment.cancel(reason || 'Annulé par l\'utilisateur');

    // Notifier le client
    await Notification.createNotification({
      recipient: appointment.client,
      type: 'rendez_vous_annulé',
      title: 'Rendez-vous annulé',
      message: `Votre rendez-vous du ${appointment.dateTime.toLocaleDateString('fr-FR')} à ${appointment.dateTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} a été annulé.`,
      data: {
        appointmentId: appointment._id,
        actionUrl: '/appointments',
        actionText: 'Prendre un nouveau rendez-vous'
      },
      channels: { inApp: true, email: true, sms: false, push: true },
      priority: 'élevé'
    });

    // Notifier l'agent si assigné
    if (appointment.agent) {
      await Notification.createNotification({
        recipient: appointment.agent,
        type: 'rendez_vous_annulé',
        title: 'Rendez-vous annulé',
        message: `Le rendez-vous du ${appointment.dateTime.toLocaleDateString('fr-FR')} a été annulé.`,
        data: {
          appointmentId: appointment._id
        },
        channels: { inApp: true, email: false, sms: false, push: true },
        priority: 'normal'
      });
    }

    res.json({ message: 'Rendez-vous annulé avec succès' });
  } catch (error) {
    console.error('Erreur annulation rendez-vous:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'annulation' });
  }
});

// Confirmer un rendez-vous (pour les agents)
router.put('/:id/confirm', auth, authorize('agent', 'administrateur'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    if (appointment.status !== 'en_attente') {
      return res.status(400).json({ error: 'Ce rendez-vous ne peut plus être confirmé' });
    }

    await appointment.confirm(req.user.id);

    // Notifier le client
    await Notification.createNotification({
      recipient: appointment.client,
      type: 'rendez_vous_confirmé',
      title: 'Rendez-vous confirmé',
      message: `Votre rendez-vous a été confirmé par notre agent ${req.user.firstName} ${req.user.lastName}.`,
      data: {
        appointmentId: appointment._id,
        actionUrl: `/appointments/${appointment._id}`,
        actionText: 'Voir les détails'
      },
      channels: { inApp: true, email: true, sms: false, push: true },
      priority: 'moyen'
    });

    res.json({
      message: 'Rendez-vous confirmé avec succès',
      appointment: await Appointment.findById(appointment._id)
        .populate('agent', 'firstName lastName')
    });
  } catch (error) {
    console.error('Erreur confirmation rendez-vous:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la confirmation' });
  }
});

// Check-in d'un rendez-vous
router.put('/:id/checkin', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    // Vérifier les permissions
    const isOwner = appointment.client.toString() === req.user.id;
    const isAgent = appointment.agent?.toString() === req.user.id;
    const isAdmin = req.user.role === 'administrateur';

    if (!isOwner && !isAgent && !isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (appointment.status !== 'confirmé') {
      return res.status(400).json({ error: 'Seul un rendez-vous confirmé peut faire un check-in' });
    }

    const { method = 'manuel' } = req.body;
    await appointment.checkIn(method);

    res.json({
      message: 'Check-in effectué avec succès',
      appointment
    });
  } catch (error) {
    console.error('Erreur check-in:', error);
    res.status(500).json({ error: 'Erreur serveur lors du check-in' });
  }
});

// Check-out d'un rendez-vous
router.put('/:id/checkout', auth, authorize('agent', 'administrateur'), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    if (appointment.status !== 'en_cours') {
      return res.status(400).json({ error: 'Seul un rendez-vous en cours peut faire un check-out' });
    }

    const { method = 'manuel' } = req.body;
    await appointment.checkOut(method);

    // Notifier le client
    await Notification.createNotification({
      recipient: appointment.client,
      type: 'rendez_vous_terminé',
      title: 'Rendez-vous terminé',
      message: 'Merci d\'avoir visité notre agence. N\'hésitez pas à donner votre avis sur votre expérience.',
      data: {
        appointmentId: appointment._id,
        actionUrl: `/appointments/${appointment._id}/feedback`,
        actionText: 'Donner son avis'
      },
      channels: { inApp: true, email: true, sms: false, push: true },
      priority: 'bas'
    });

    res.json({
      message: 'Check-out effectué avec succès',
      appointment
    });
  } catch (error) {
    console.error('Erreur check-out:', error);
    res.status(500).json({ error: 'Erreur serveur lors du check-out' });
  }
});

// Ajouter un feedback
router.post('/:id/feedback', [
  auth,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
  body('comment').optional().isString().isLength({ max: 500 }).withMessage('Le commentaire ne peut pas dépasser 500 caractères')
], handleValidationErrors, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    // Vérifier les permissions
    const isOwner = appointment.client.toString() === req.user.id;
    if (!isOwner) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    if (appointment.status !== 'terminé') {
      return res.status(400).json({ error: 'Un feedback ne peut être ajouté qu\'à un rendez-vous terminé' });
    }

    if (appointment.feedback) {
      return res.status(400).json({ error: 'Un feedback a déjà été ajouté à ce rendez-vous' });
    }

    const { rating, comment } = req.body;
    await appointment.addFeedback(rating, comment);

    // Mettre à jour les statistiques de l'agence et du service
    const [agency, service] = await Promise.all([
      Agency.findById(appointment.agency),
      Service.findById(appointment.service)
    ]);

    await Promise.all([
      agency.updateRating(rating),
      service.updateRating(rating)
    ]);

    res.json({
      message: 'Feedback ajouté avec succès',
      appointment
    });
  } catch (error) {
    console.error('Erreur ajout feedback:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du feedback' });
  }
});

// Obtenir les créneaux disponibles pour une agence et une date
router.get('/available-slots/:agencyId/:date', auth, async (req, res) => {
  try {
    const { agencyId, date } = req.params;
    const { serviceId } = req.query;

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    let duration = 30; // Durée par défaut
    if (serviceId) {
      const service = await Service.findById(serviceId);
      if (service) {
        duration = service.duration;
      }
    }

    const availableSlots = await getAvailableSlots(agencyId, new Date(date), duration);
    
    res.json({ availableSlots });
  } catch (error) {
    console.error('Erreur créneaux disponibles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Helper function pour obtenir les créneaux disponibles
async function getAvailableSlots(agencyId, date, duration) {
  const agency = await Agency.findById(agencyId);
  if (!agency) return [];

  const dayOfWeek = date.getDay();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayHours = agency.openingHours[days[dayOfWeek]];

  if (dayHours.closed) return [];

  const [openHour, openMin] = dayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = dayHours.close.split(':').map(Number);

  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  // Obtenir les rendez-vous existants pour cette journée
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const existingAppointments = await Appointment.find({
    agency: agencyId,
    dateTime: { $gte: dayStart, $lte: dayEnd },
    status: { $in: ['confirmé', 'en_cours'] }
  });

  const occupiedSlots = existingAppointments.map(apt => {
    const start = new Date(apt.dateTime);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + apt.duration);
    
    return {
      start: start.getHours() * 60 + start.getMinutes(),
      end: end.getHours() * 60 + end.getMinutes()
    };
  });

  // Générer les créneaux disponibles
  const availableSlots = [];
  let currentTime = openTime;

  while (currentTime + duration <= closeTime) {
    const slotEnd = currentTime + duration;
    
    // Vérifier si ce créneau est libre
    const isOccupied = occupiedSlots.some(slot => 
      (currentTime < slot.end && slotEnd > slot.start)
    );

    if (!isOccupied) {
      const slotDate = new Date(date);
      slotDate.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);
      
      availableSlots.push({
        time: slotDate.toISOString(),
        formatted: slotDate.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      });
    }

    currentTime += 30; // Intervalles de 30 minutes
  }

  return availableSlots;
}

module.exports = router;
