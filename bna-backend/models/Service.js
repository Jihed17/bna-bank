const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du service est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
    enum: [
      'comptes_bancaires',
      'credits_et_financement',
      'cartes_bancaires',
      'services_electroniques',
      'change_et_devises',
      'assurances',
      'investissement',
      'services_aux_entreprises',
      'autres'
    ]
  },
  subcategory: {
    type: String,
    required: [true, 'La sous-catégorie est requise']
  },
  icon: {
    type: String,
    required: [true, 'L\'icône est requise']
  },
  image: {
    type: String,
    default: ''
  },
  duration: {
    type: Number, // en minutes
    required: [true, 'La durée est requise'],
    min: [5, 'La durée minimale est de 5 minutes'],
    max: [480, 'La durée maximale est de 8 heures']
  },
  requirements: [{
    type: String,
    required: true
  }],
  documents: [{
    name: String,
    description: String,
    required: Boolean
  }],
  fees: {
    type: Number,
    default: 0,
    min: [0, 'Les frais ne peuvent pas être négatifs']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  requiresAppointment: {
    type: Boolean,
    default: true
  },
  availableInAgencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency'
  }],
  targetAudience: {
    type: String,
    enum: ['particuliers', 'professionnels', 'entreprises', 'tous'],
    default: 'tous'
  },
  priority: {
    type: String,
    enum: ['bas', 'moyen', 'élevé'],
    default: 'moyen'
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  faq: [{
    question: String,
    answer: String
  }],
  statistics: {
    views: { type: Number, default: 0 },
    appointments: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
serviceSchema.index({ category: 1, subcategory: 1 });
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ targetAudience: 1 });
serviceSchema.index({ tags: 1 });
serviceSchema.index({ name: 'text', description: 'text' });

// Méthode pour incrémenter les vues
serviceSchema.methods.incrementViews = function() {
  this.statistics.views += 1;
  return this.save();
};

// Méthode pour incrémenter les rendez-vous
serviceSchema.methods.incrementAppointments = function() {
  this.statistics.appointments += 1;
  return this.save();
};

// Méthode pour mettre à jour la note
serviceSchema.methods.updateRating = function(newRating) {
  const totalReviews = this.statistics.reviews;
  const currentRating = this.statistics.rating;
  
  this.statistics.reviews += 1;
  this.statistics.rating = ((currentRating * totalReviews) + newRating) / this.statistics.reviews;
  
  return this.save();
};

// Virtual pour la durée formatée
serviceSchema.virtual('formattedDuration').get(function() {
  if (this.duration < 60) {
    return `${this.duration} min`;
  } else {
    const hours = Math.floor(this.duration / 60);
    const minutes = this.duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
});

module.exports = mongoose.model('Service', serviceSchema);
