const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le client est requis']
  },
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: [true, 'L\'agence est requise']
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Le service est requis']
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dateTime: {
    type: Date,
    required: [true, 'La date et heure sont requises']
  },
  duration: {
    type: Number, // en minutes
    required: [true, 'La durée est requise'],
    min: [5, 'La durée minimale est de 5 minutes']
  },
  status: {
    type: String,
    enum: ['en_attente', 'confirmé', 'en_cours', 'terminé', 'annulé', 'reporté'],
    default: 'en_attente'
  },
  priority: {
    type: String,
    enum: ['bas', 'normal', 'élevé', 'urgent'],
    default: 'normal'
  },
  notes: {
    client: String,
    agent: String,
    internal: String
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  reminder: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    sent: { type: Boolean, default: false },
    sentAt: Date
  },
  checkIn: {
    time: Date,
    method: {
      type: String,
      enum: ['manuel', 'qr_code', 'automatique'],
      default: 'manuel'
    }
  },
  checkOut: {
    time: Date,
    method: {
      type: String,
      enum: ['manuel', 'automatique'],
      default: 'manuel'
    }
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: Date
  },
  cancellationReason: String,
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  rescheduledTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches
appointmentSchema.index({ client: 1, dateTime: -1 });
appointmentSchema.index({ agency: 1, dateTime: 1 });
appointmentSchema.index({ agent: 1, dateTime: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ dateTime: 1 });
appointmentSchema.index({ service: 1 });

// Compound index pour éviter les doublons
appointmentSchema.index(
  { agency: 1, agent: 1, dateTime: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['confirmé', 'en_cours'] } } }
);

// Virtual pour la fin du rendez-vous
appointmentSchema.virtual('endTime').get(function() {
  const endTime = new Date(this.dateTime);
  endTime.setMinutes(endTime.getMinutes() + this.duration);
  return endTime;
});

// Virtual pour savoir si le rendez-vous est dans le passé
appointmentSchema.virtual('isPast').get(function() {
  return new Date() > this.endTime;
});

// Virtual pour savoir si le rendez-vous est aujourd'hui
appointmentSchema.virtual('isToday').get(function() {
  const today = new Date();
  const appointmentDate = new Date(this.dateTime);
  return today.toDateString() === appointmentDate.toDateString();
});

// Middleware pour mettre à jour updatedAt
appointmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Méthode statique pour vérifier la disponibilité
appointmentSchema.statics.checkAvailability = async function(agency, agent, dateTime, duration, excludeAppointmentId = null) {
  const startTime = new Date(dateTime);
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + duration);

  const query = {
    agency,
    dateTime: { $lt: endTime },
    status: { $in: ['confirmé', 'en_cours'] }
  };

  if (agent) {
    query.agent = agent;
  }

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  const conflictingAppointments = await this.find(query);

  return conflictingAppointments.filter(apt => {
    const aptStart = new Date(apt.dateTime);
    const aptEnd = new Date(aptStart);
    aptEnd.setMinutes(aptEnd.getMinutes() + apt.duration);

    return (startTime < aptEnd && endTime > aptStart);
  });
};

// Méthode pour confirmer le rendez-vous
appointmentSchema.methods.confirm = function(agentId) {
  this.status = 'confirmé';
  this.agent = agentId;
  return this.save();
};

// Méthode pour annuler le rendez-vous
appointmentSchema.methods.cancel = function(reason) {
  this.status = 'annulé';
  this.cancellationReason = reason;
  return this.save();
};

// Méthode pour reporter le rendez-vous
appointmentSchema.methods.reschedule = function(newDateTime, newDuration) {
  this.status = 'reporté';
  this.rescheduledTo = new mongoose.Types.ObjectId();
  return this.save();
};

// Méthode pour check-in
appointmentSchema.methods.performcheckIn = function(method = 'manuel') {
  this.checkIn = {
    time: new Date(),
    method: method
  };
  this.status = 'en_cours';
  return this.save();
};

// Méthode pour check-out
appointmentSchema.methods.performcheckOut = function(method = 'manuel') {
  this.checkOut = {
    time: new Date(),
    method: method
  };
  this.status = 'terminé';
  return this.save();
};

// Méthode pour ajouter un feedback
appointmentSchema.methods.addFeedback = function(rating, comment) {
  this.feedback = {
    rating,
    comment,
    submittedAt: new Date()
  };
  return this.save();
};

module.exports = mongoose.model('Appointment', appointmentSchema);
