const express = require('express');
const { body, validationResult } = require('express-validator');
const Agency = require('../models/Agency');
const Service = require('../models/Service');
const { auth, authorize, optionalAuth } = require('../middleware/auth');
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

// Obtenir toutes les agences avec filtres
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      governorate, 
      city,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      hasParking,
      hasAccessibility,
      isOpen
    } = req.query;

    const skip = (page - 1) * limit;

    // Construire la requête
    let query = { isActive: true };

    if (governorate) {
      query['address.governorate'] = governorate;
    }

    if (city) {
      query['address.city'] = new RegExp(city, 'i');
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { 'address.city': new RegExp(search, 'i') },
        { 'address.street': new RegExp(search, 'i') }
      ];
    }

    if (hasParking === 'true') {
      query.facilities = 'parking';
    }

    if (hasAccessibility === 'true') {
      query.facilities = 'accessibilite_pmr';
    }

    // Configurer le tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Exécuter la requête
    const agencies = await Agency.find(query)
      .populate('services', 'name category')
      .populate('staff.user', 'firstName lastName role')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Agency.countDocuments(query);

    res.json({
      agencies,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: agencies.length,
        total
      }
    });
  } catch (error) {
    console.error('Erreur récupération agences:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir une agence spécifique
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id)
      .populate('services', 'name category duration fees')
      .populate('staff.user', 'firstName lastName email role');

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    if (!agency.isActive) {
      return res.status(404).json({ error: 'Agence non disponible' });
    }

    res.json({ agency });
  } catch (error) {
    console.error('Erreur récupération agence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les agences proches (géolocalisation)
router.get('/nearby/:lat/:lng', optionalAuth, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const { maxDistance = 10000 } = req.query; // Distance en mètres (par défaut 10km)

    const coordinates = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng)
    };

    // Validation des coordonnées
    if (isNaN(coordinates.latitude) || isNaN(coordinates.longitude)) {
      return res.status(400).json({ error: 'Coordonnées invalides' });
    }

    const agencies = await Agency.findNearby(coordinates, parseInt(maxDistance))
      .populate('services', 'name category');

    // Calculer la distance pour chaque agence
    const agenciesWithDistance = agencies.map(agency => {
      const distance = calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        agency.address.coordinates.latitude,
        agency.address.coordinates.longitude
      );

      return {
        ...agency.toObject(),
        distance: Math.round(distance * 100) / 100, // Distance en km avec 2 décimales
        isOpenNow: agency.isOpenNow
      };
    });

    // Trier par distance
    agenciesWithDistance.sort((a, b) => a.distance - b.distance);

    res.json({ agencies: agenciesWithDistance });
  } catch (error) {
    console.error('Erreur agences proches:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les gouvernorats disponibles
router.get('/governorates/list', async (req, res) => {
  try {
    const governorates = await Agency.distinct('address.governorate', { isActive: true });
    
    const governorateInfo = governorates.map(gov => ({
      name: gov,
      count: Agency.countDocuments({ 'address.governorate': gov, isActive: true })
    }));

    res.json({ governorates: governorateInfo });
  } catch (error) {
    console.error('Erreur récupération gouvernorats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les villes pour un gouvernorat
router.get('/cities/:governorate', async (req, res) => {
  try {
    const { governorate } = req.params;
    
    const cities = await Agency.distinct('address.city', { 
      'address.governorate': governorate, 
      isActive: true 
    });

    res.json({ cities });
  } catch (error) {
    console.error('Erreur récupération villes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les agences ouvertes actuellement
router.get('/open/list', async (req, res) => {
  try {
    const agencies = await Agency.find({ isActive: true })
      .populate('services', 'name category');

    const openAgencies = agencies.filter(agency => agency.isOpenNow);

    res.json({ agencies: openAgencies });
  } catch (error) {
    console.error('Erreur agences ouvertes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les statistiques d'une agence
router.get('/:id/statistics', auth, authorize('agent', 'administrateur'), async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    // Vérifier les permissions
    const isStaff = agency.staff.some(staff => 
      staff.user.toString() === req.user.id && staff.isActive
    );
    const isAdmin = req.user.role === 'administrateur';

    if (!isStaff && !isAdmin) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const statistics = {
      totalAppointments: agency.statistics.totalAppointments,
      averageRating: agency.statistics.averageRating,
      totalReviews: agency.statistics.totalReviews,
      capacity: agency.capacity,
      staffCount: agency.staff.filter(staff => staff.isActive).length,
      servicesCount: agency.services.length,
      facilities: agency.facilities,
      lastUpdated: agency.statistics.lastUpdated
    };

    res.json({ statistics });
  } catch (error) {
    console.error('Erreur statistiques agence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une agence (admin uniquement)
router.post('/', [
  auth,
  authorize('administrateur'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('code').trim().isLength({ min: 2, max: 10 }).withMessage('Le code doit contenir entre 2 et 10 caractères'),
  body('address.street').trim().notEmpty().withMessage('L\'adresse est requise'),
  body('address.city').trim().notEmpty().withMessage('La ville est requise'),
  body('address.zipCode').matches(/^[0-9]{4}$/).withMessage('Le code postal doit contenir 4 chiffres'),
  body('address.governorate').isIn([
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
    'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Gabès', 'Medenine', 'Tozeur', 'Kebili', 'Gafsa', 'Tataouine'
  ]).withMessage('Gouvernorat invalide'),
  body('address.coordinates.latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
  body('address.coordinates.longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
  body('contact.phone').matches(/^(\+216)?[0-9]{8}$/).withMessage('Le téléphone tunisien doit contenir 8 chiffres'),
  body('contact.email').optional().isEmail().withMessage('Email invalide'),
  body('capacity.dailyAppointments').isInt({ min: 1 }).withMessage('La capacité journalière doit être positive'),
  body('capacity.simultaneousClients').isInt({ min: 1 }).withMessage('La capacité simultanée doit être positive')
], handleValidationErrors, async (req, res) => {
  try {
    const agencyData = req.body;

    // Vérifier que le code est unique
    const existingAgency = await Agency.findOne({ code: agencyData.code });
    if (existingAgency) {
      return res.status(400).json({ error: 'Ce code d\'agence existe déjà' });
    }

    const agency = new Agency(agencyData);
    await agency.save();

    res.status(201).json({
      message: 'Agence créée avec succès',
      agency
    });
  } catch (error) {
    console.error('Erreur création agence:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création' });
  }
});

// Mettre à jour une agence (admin uniquement)
router.put('/:id', [
  auth,
  authorize('administrateur'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('address.street').optional().trim().notEmpty().withMessage('L\'adresse est requise'),
  body('address.city').optional().trim().notEmpty().withMessage('La ville est requise'),
  body('address.zipCode').optional().matches(/^[0-9]{4}$/).withMessage('Le code postal doit contenir 4 chiffres'),
  body('address.governorate').optional().isIn([
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
    'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Gabès', 'Medenine', 'Tozeur', 'Kebili', 'Gafsa', 'Tataouine'
  ]).withMessage('Gouvernorat invalide'),
  body('contact.phone').optional().matches(/^(\+216)?[0-9]{8}$/).withMessage('Le téléphone tunisien doit contenir 8 chiffres'),
  body('contact.email').optional().isEmail().withMessage('Email invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    const updates = req.body;
    Object.assign(agency, updates);
    await agency.save();

    res.json({
      message: 'Agence mise à jour avec succès',
      agency
    });
  } catch (error) {
    console.error('Erreur mise à jour agence:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});

// Supprimer une agence (admin uniquement)
router.delete('/:id', auth, authorize('administrateur'), async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    // Soft delete : marquer comme inactif
    agency.isActive = false;
    await agency.save();

    res.json({ message: 'Agence supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression agence:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});

// Ajouter un membre du personnel à une agence
router.post('/:id/staff', [
  auth,
  authorize('administrateur'),
  body('userId').isMongoId().withMessage('ID utilisateur invalide'),
  body('role').isIn(['directeur', 'agent', 'conseiller', 'guichetier']).withMessage('Rôle invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    // Vérifier que l'utilisateur existe
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier que l'utilisateur n'est pas déjà dans le personnel
    const existingStaff = agency.staff.find(staff => 
      staff.user.toString() === userId
    );
    if (existingStaff) {
      return res.status(400).json({ error: 'Cet utilisateur est déjà dans le personnel de cette agence' });
    }

    agency.staff.push({
      user: userId,
      role,
      isActive: true
    });
    await agency.save();

    res.json({
      message: 'Membre du personnel ajouté avec succès',
      agency
    });
  } catch (error) {
    console.error('Erreur ajout personnel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Retirer un membre du personnel d'une agence
router.delete('/:id/staff/:userId', auth, authorize('administrateur'), async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    agency.staff = agency.staff.filter(staff => 
      staff.user.toString() !== req.params.userId
    );
    await agency.save();

    res.json({
      message: 'Membre du personnel retiré avec succès',
      agency
    });
  } catch (error) {
    console.error('Erreur retrait personnel:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Helper function pour calculer la distance entre deux points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

module.exports = router;
