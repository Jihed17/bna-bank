const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le destinataire est requis']
  },
  type: {
    type: String,
    enum: [
      'rendez_vous_créé',
      'rendez_vous_confirmé',
      'rendez_vous_rappel',
      'rendez_vous_annulé',
      'rendez_vous_reporté',
      'rendez_vous_terminé',
      'message_support',
      'mise_à_jour_service',
      'promotion',
      'sécurité',
      'système'
    ],
    required: [true, 'Le type de notification est requis']
  },
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères']
  },
  message: {
    type: String,
    required: [true, 'Le message est requis'],
    maxlength: [500, 'Le message ne peut pas dépasser 500 caractères']
  },
  data: {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agency' },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    actionUrl: String,
    actionText: String
  },
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  },
  status: {
    type: String,
    enum: ['envoyé', 'en_attente', 'échoué', 'lu'],
    default: 'en_attente'
  },
  priority: {
    type: String,
    enum: ['bas', 'moyen', 'élevé', 'urgent'],
    default: 'moyen'
  },
  readAt: Date,
  sentAt: Date,
  scheduledFor: Date,
  retryCount: {
    type: Number,
    default: 0,
    max: 3
  },
  errorMessage: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ priority: 1 });

// Virtual pour savoir si la notification est lue
notificationSchema.virtual('isRead').get(function() {
  return this.status === 'lu' || this.readAt !== null;
});

// Virtual pour le temps écoulé
notificationSchema.virtual('timeElapsed').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffMs = now - created;
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) {
    return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  } else {
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  }
});

// Méthode pour marquer comme lu
notificationSchema.methods.markAsRead = function() {
  this.status = 'lu';
  this.readAt = new Date();
  return this.save();
};

// Méthode pour marquer comme envoyé
notificationSchema.methods.markAsSent = function() {
  this.status = 'envoyé';
  this.sentAt = new Date();
  return this.save();
};

// Méthode pour marquer comme échoué
notificationSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'échoué';
  this.errorMessage = errorMessage;
  this.retryCount += 1;
  return this.save();
};

// Méthode statique pour créer une notification
notificationSchema.statics.createNotification = function(data) {
  const notification = new this(data);
  return notification.save();
};

// Méthode statique pour les notifications non lues
notificationSchema.statics.findUnread = function(userId) {
  return this.find({
    recipient: userId,
    status: { $in: ['envoyé', 'en_attente'] }
  }).sort({ createdAt: -1 });
};

// Méthode statique pour compter les notifications non lues
notificationSchema.statics.countUnread = function(userId) {
  return this.countDocuments({
    recipient: userId,
    status: { $in: ['envoyé', 'en_attente'] }
  });
};

// Middleware pour créer des notifications automatiques
notificationSchema.post('save', async function(doc) {
  // Envoyer les notifications selon les canaux configurés
  if (doc.channels.email && doc.status === 'en_attente') {
    // Logique d'envoi d'email à implémenter
    console.log(`Email notification envoyée à l'utilisateur ${doc.recipient}`);
  }
  
  if (doc.channels.sms && doc.status === 'en_attente') {
    // Logique d'envoi SMS à implémenter
    console.log(`SMS notification envoyée à l'utilisateur ${doc.recipient}`);
  }
  
  if (doc.channels.push && doc.status === 'en_attente') {
    // Logique d'envoi push notification à implémenter
    console.log(`Push notification envoyée à l'utilisateur ${doc.recipient}`);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
