const express = require('express');
const { body, validationResult } = require('express-validator');
const Service = require('../models/Service');
const Agency = require('../models/Agency');
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

// Obtenir tous les services avec filtres
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      subcategory, 
      search,
      targetAudience,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const skip = (page - 1) * limit;

    // Construire la requête
    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (subcategory) {
      query.subcategory = subcategory;
    }

    if (targetAudience) {
      query.targetAudience = targetAudience;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Configurer le tri
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Exécuter la requête
    const services = await Service.find(query)
      .populate('availableInAgencies', 'name address.city')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(query);

    // Incrémenter les vues si utilisateur connecté
    if (req.user) {
      services.forEach(service => {
        service.incrementViews().catch(err => 
          console.error('Erreur incrément vues:', err)
        );
      });
    }

    res.json({
      services,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: services.length,
        total
      }
    });
  } catch (error) {
    console.error('Erreur récupération services:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir un service spécifique
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('availableInAgencies', 'name address.city address.governorate contact.phone openingHours');

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    if (!service.isActive) {
      return res.status(404).json({ error: 'Service non disponible' });
    }

    // Incrémenter les vues si utilisateur connecté
    if (req.user) {
      await service.incrementViews();
    }

    res.json({ service });
  } catch (error) {
    console.error('Erreur récupération service:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les catégories de services
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Service.distinct('category', { isActive: true });
    
    const categoryInfo = {
      comptes_bancaires: {
        name: 'Comptes Bancaires',
        description: 'Ouverture et gestion de comptes',
        icon: 'account-balance',
        count: await Service.countDocuments({ category: 'comptes_bancaires', isActive: true })
      },
      credits_et_financement: {
        name: 'Crédits et Financement',
        description: 'Prêts personnels et professionnels',
        icon: 'loan',
        count: await Service.countDocuments({ category: 'credits_et_financement', isActive: true })
      },
      cartes_bancaires: {
        name: 'Cartes Bancaires',
        description: 'Cartes de crédit et de débit',
        icon: 'credit-card',
        count: await Service.countDocuments({ category: 'cartes_bancaires', isActive: true })
      },
      services_electroniques: {
        name: 'Services Électroniques',
        description: 'Banque en ligne et mobile',
        icon: 'smartphone',
        count: await Service.countDocuments({ category: 'services_electroniques', isActive: true })
      },
      change_et_devises: {
        name: 'Change et Devises',
        description: 'Services de change',
        icon: 'currency-exchange',
        count: await Service.countDocuments({ category: 'change_et_devises', isActive: true })
      },
      assurances: {
        name: 'Assurances',
        description: 'Produits d\'assurance',
        icon: 'shield',
        count: await Service.countDocuments({ category: 'assurances', isActive: true })
      },
      investissement: {
        name: 'Investissement',
        description: 'Produits d\'investissement',
        icon: 'trending-up',
        count: await Service.countDocuments({ category: 'investissement', isActive: true })
      },
      services_aux_entreprises: {
        name: 'Services aux Entreprises',
        description: 'Services B2B',
        icon: 'business',
        count: await Service.countDocuments({ category: 'services_aux_entreprises', isActive: true })
      },
      autres: {
        name: 'Autres Services',
        description: 'Autres services bancaires',
        icon: 'more-horiz',
        count: await Service.countDocuments({ category: 'autres', isActive: true })
      }
    };

    const result = categories.map(cat => categoryInfo[cat]).filter(Boolean);

    res.json({ categories: result });
  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les sous-catégories pour une catégorie
router.get('/subcategories/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const subcategories = await Service.distinct('subcategory', { 
      category, 
      isActive: true 
    });

    res.json({ subcategories });
  } catch (error) {
    console.error('Erreur récupération sous-catégories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les services par agence
router.get('/agency/:agencyId', async (req, res) => {
  try {
    const { agencyId } = req.params;
    const { category } = req.query;

    // Vérifier que l'agence existe
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    let query = { 
      availableInAgencies: agencyId, 
      isActive: true 
    };

    if (category) {
      query.category = category;
    }

    const services = await Service.find(query)
      .sort({ name: 1 });

    res.json({ services });
  } catch (error) {
    console.error('Erreur récupération services agence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les services populaires
router.get('/popular/list', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const services = await Service.find({ isActive: true })
      .sort({ 'statistics.appointments': -1, 'statistics.views': -1 })
      .limit(parseInt(limit))
      .populate('availableInAgencies', 'name address.city');

    res.json({ services });
  } catch (error) {
    console.error('Erreur récupération services populaires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Obtenir les services récemment consultés (pour un utilisateur)
router.get('/recent/list', auth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Cette fonctionnalité nécessiterait un tracking des vues par utilisateur
    // Pour l'instant, on retourne les services les plus vus
    const services = await Service.find({ isActive: true })
      .sort({ 'statistics.views': -1 })
      .limit(parseInt(limit));

    res.json({ services });
  } catch (error) {
    console.error('Erreur récupération services récents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un service (admin uniquement)
router.post('/', [
  auth,
  authorize('administrateur'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('La description doit contenir entre 10 et 500 caractères'),
  body('category').isIn([
    'comptes_bancaires', 'credits_et_financement', 'cartes_bancaires',
    'services_electroniques', 'change_et_devises', 'assurances',
    'investissement', 'services_aux_entreprises', 'autres'
  ]).withMessage('Catégorie invalide'),
  body('subcategory').trim().notEmpty().withMessage('La sous-catégorie est requise'),
  body('icon').trim().notEmpty().withMessage('L\'icône est requise'),
  body('duration').isInt({ min: 5, max: 480 }).withMessage('La durée doit être entre 5 et 480 minutes'),
  body('requirements').isArray().withMessage('Les prérequis doivent être un tableau'),
  body('documents').isArray().withMessage('Les documents doivent être un tableau'),
  body('fees').isFloat({ min: 0 }).withMessage('Les frais doivent être positifs'),
  body('targetAudience').isIn(['particuliers', 'professionnels', 'entreprises', 'tous']).withMessage('Audience cible invalide'),
  body('priority').isIn(['bas', 'moyen', 'élevé']).withMessage('Priorité invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const serviceData = req.body;

    const service = new Service(serviceData);
    await service.save();

    res.status(201).json({
      message: 'Service créé avec succès',
      service
    });
  } catch (error) {
    console.error('Erreur création service:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création' });
  }
});

// Mettre à jour un service (admin uniquement)
router.put('/:id', [
  auth,
  authorize('administrateur'),
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
  body('description').optional().trim().isLength({ min: 10, max: 500 }).withMessage('La description doit contenir entre 10 et 500 caractères'),
  body('category').optional().isIn([
    'comptes_bancaires', 'credits_et_financement', 'cartes_bancaires',
    'services_electroniques', 'change_et_devises', 'assurances',
    'investissement', 'services_aux_entreprises', 'autres'
  ]).withMessage('Catégorie invalide'),
  body('subcategory').optional().trim().notEmpty().withMessage('La sous-catégorie est requise'),
  body('icon').optional().trim().notEmpty().withMessage('L\'icône est requise'),
  body('duration').optional().isInt({ min: 5, max: 480 }).withMessage('La durée doit être entre 5 et 480 minutes'),
  body('fees').optional().isFloat({ min: 0 }).withMessage('Les frais doivent être positifs'),
  body('targetAudience').optional().isIn(['particuliers', 'professionnels', 'entreprises', 'tous']).withMessage('Audience cible invalide'),
  body('priority').optional().isIn(['bas', 'moyen', 'élevé']).withMessage('Priorité invalide')
], handleValidationErrors, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    const updates = req.body;
    Object.assign(service, updates);
    await service.save();

    res.json({
      message: 'Service mis à jour avec succès',
      service
    });
  } catch (error) {
    console.error('Erreur mise à jour service:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour' });
  }
});

// Supprimer un service (admin uniquement)
router.delete('/:id', auth, authorize('administrateur'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    // Soft delete : marquer comme inactif
    service.isActive = false;
    await service.save();

    res.json({ message: 'Service supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression service:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});

// Ajouter une agence à un service (admin uniquement)
router.post('/:id/agencies/:agencyId', auth, authorize('administrateur'), async (req, res) => {
  try {
    const [service, agency] = await Promise.all([
      Service.findById(req.params.id),
      Agency.findById(req.params.agencyId)
    ]);

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    if (!service.availableInAgencies.includes(agency._id)) {
      service.availableInAgencies.push(agency._id);
      await service.save();
    }

    if (!agency.services.includes(service._id)) {
      agency.services.push(service._id);
      await agency.save();
    }

    res.json({
      message: 'Service ajouté à l\'agence avec succès',
      service
    });
  } catch (error) {
    console.error('Erreur ajout service agence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Retirer une agence d'un service (admin uniquement)
router.delete('/:id/agencies/:agencyId', auth, authorize('administrateur'), async (req, res) => {
  try {
    const [service, agency] = await Promise.all([
      Service.findById(req.params.id),
      Agency.findById(req.params.agencyId)
    ]);

    if (!service) {
      return res.status(404).json({ error: 'Service non trouvé' });
    }

    if (!agency) {
      return res.status(404).json({ error: 'Agence non trouvée' });
    }

    service.availableInAgencies = service.availableInAgencies.filter(
      id => id.toString() !== agency._id.toString()
    );
    await service.save();

    agency.services = agency.services.filter(
      id => id.toString() !== service._id.toString()
    );
    await agency.save();

    res.json({
      message: 'Service retiré de l\'agence avec succès',
      service
    });
  } catch (error) {
    console.error('Erreur retrait service agence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
