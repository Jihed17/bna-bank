const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de l\'agence est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  code: {
    type: String,
    required: [true, 'Le code de l\'agence est requis'],
    unique: true,
    uppercase: true,
    trim: true
  },
  address: {
    street: {
      type: String,
      required: [true, 'L\'adresse est requise']
    },
    city: {
      type: String,
      required: [true, 'La ville est requise']
    },
    zipCode: {
      type: String,
      required: [true, 'Le code postal est requis'],
      match: [/^[0-9]{4}$/, 'Le code postal doit contenir 4 chiffres']
    },
    governorate: {
      type: String,
      required: [true, 'Le gouvernorat est requis'],
      enum: [
        'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
        'Bizerte', 'Béja', 'Jendouba', 'Le Kef', 'Siliana', 'Sousse',
        'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
        'Gabès', 'Medenine', 'Tozeur', 'Kebili', 'Gafsa', 'Tataouine'
      ]
    },
    coordinates: {
      latitude: {
        type: Number,
        required: [true, 'La latitude est requise'],
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: [true, 'La longitude est requise'],
        min: -180,
        max: 180
      }
    }
  },
  contact: {
    phone: {
      type: String,
      required: [true, 'Le téléphone est requis'],
      match: [/^(\+216)?[0-9]{8}$/, 'Le numéro de téléphone tunisien doit contenir 8 chiffres']
    },
    fax: {
      type: String,
      match: [/^(\+216)?[0-9]{8}$/, 'Le numéro de fax tunisien doit contenir 8 chiffres']
    },
    email: {
      type: String,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Veuillez fournir un email valide']
    }
  },
  openingHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: true } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: true } }
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  staff: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['directeur', 'agent', 'conseiller', 'guichetier'],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  capacity: {
    dailyAppointments: {
      type: Number,
      default: 50,
      min: [1, 'La capacité doit être d\'au moins 1']
    },
    simultaneousClients: {
      type: Number,
      default: 10,
      min: [1, 'La capacité simultanée doit être d\'au moins 1']
    }
  },
  facilities: [{
    type: String,
    enum: [
      'guichet_automatique', 'parking', 'accessibilite_pmr', 'wifi',
      'zone_attente', 'caveau_fort', 'drive', 'salle_conference'
    ]
  }],
  images: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: String,
    enum: ['bas', 'moyen', 'élevé'],
    default: 'moyen'
  },
  statistics: {
    totalAppointments: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
agencySchema.index({ 'address.governorate': 1, 'address.city': 1 });
agencySchema.index({ isActive: 1 });
agencySchema.index({ code: 1 });
agencySchema.index({ 'address.coordinates': '2dsphere' });

// Virtual pour vérifier si l'agence est ouverte maintenant
agencySchema.virtual('isOpenNow').get(function() {
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayHours = this.openingHours[days[day]];
  
  if (todayHours.closed) return false;
  
  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  
  return currentTime >= openTime && currentTime <= closeTime;
});

// Virtual pour les heures d'ouverture formatées
agencySchema.virtual('formattedOpeningHours').get(function() {
  const days = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };
  
  return Object.entries(this.openingHours)
    .filter(([_, hours]) => !hours.closed)
    .map(([day, hours]) => `${days[day]}: ${hours.open} - ${hours.close}`);
});

// Méthode pour incrémenter les statistiques
agencySchema.methods.incrementAppointments = function() {
  this.statistics.totalAppointments += 1;
  this.statistics.lastUpdated = new Date();
  return this.save();
};

// Méthode pour mettre à jour la note
agencySchema.methods.updateRating = function(newRating) {
  const totalReviews = this.statistics.totalReviews;
  const currentRating = this.statistics.averageRating;
  
  this.statistics.totalReviews += 1;
  this.statistics.averageRating = ((currentRating * totalReviews) + newRating) / this.statistics.totalReviews;
  this.statistics.lastUpdated = new Date();
  
  return this.save();
};

// Méthode pour trouver les agences proches
agencySchema.statics.findNearby = function(coordinates, maxDistance = 10000) {
  return this.find({
    isActive: true,
    'address.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [coordinates.longitude, coordinates.latitude]
        },
        $maxDistance: maxDistance
      }
    }
  }).populate('services', 'name category duration');
};

module.exports = mongoose.model('Agency', agencySchema);
