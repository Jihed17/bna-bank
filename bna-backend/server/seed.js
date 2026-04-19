const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

// Import models
const User = require('../models/User');
const Service = require('../models/Service');
const Agency = require('../models/Agency');

// Sample data
const sampleUsers = [
  {
    firstName: 'Client',
    lastName: 'Demo',
    email: 'client@bna.tn',
    phone: '21612345678',
    cin: '12345678',
    password: 'client123',
    role: 'client',
    dateOfBirth: '1990-01-01',
    address: {
      street: '123 Rue Habib Bourguiba',
      city: 'Tunis',
      zipCode: '1000',
      governorate: 'Tunis'
    }
  },
  {
    firstName: 'Agent',
    lastName: 'Demo',
    email: 'agent@bna.tn',
    phone: '21687654321',
    cin: '87654321',
    password: 'agent123',
    role: 'agent',
    dateOfBirth: '1985-05-15',
    address: {
      street: '45 Avenue Farhat Hached',
      city: 'Sousse',
      zipCode: '4000',
      governorate: 'Sousse'
    }
  },
  {
    firstName: 'Admin',
    lastName: 'Demo',
    email: 'admin@bna.tn',
    phone: '21611223344',
    cin: '11223344',
    password: 'admin123',
    role: 'administrateur',
    dateOfBirth: '1980-10-20',
    address: {
      street: '10 Avenue Habib Bourguiba',
      city: 'Tunis',
      zipCode: '1000',
      governorate: 'Tunis'
    }
  }
];

const sampleServices = [
  {
    name: 'Ouverture de compte courant',
    description: 'Ouvrez un compte courant pour vos transactions quotidiennes',
    category: 'comptes_bancaires',
    subcategory: 'compte_courant',
    duration: 30,
    requirements: ['Carte d\'identité nationale', 'Justificatif de domicile', 'Justificatif de revenus'],
    documents: ['CIN', 'Justificatif de domicile', 'Justificatif de revenus'],
    fees: 0,
    isActive: true
  },
  {
    name: 'Ouverture de compte épargne',
    description: 'Faites fructifier votre argent avec un compte épargne',
    category: 'comptes_bancaires',
    subcategory: 'compte_epargne',
    duration: 25,
    requirements: ['Carte d\'identité nationale', 'Justificatif de domicile'],
    documents: ['CIN', 'Justificatif de domicile'],
    fees: 0,
    isActive: true
  },
  {
    name: 'Crédit personnel',
    description: 'Financez vos projets personnels avec notre crédit personnel',
    category: 'credits_et_financement',
    subcategory: 'credit_personnel',
    duration: 45,
    requirements: ['Carte d\'identité nationale', 'Justificatif de domicile', 'Justificatif de revenus', 'Garantie'],
    documents: ['CIN', 'Justificatif de domicile', 'Bulletins de salaire', 'Garantie'],
    fees: 50,
    isActive: true
  },
  {
    name: 'Carte Visa Classic',
    description: 'Carte bancaire internationale pour vos paiements quotidiens',
    category: 'cartes_bancaires',
    subcategory: 'carte_debit',
    duration: 20,
    requirements: ['Carte d\'identité nationale', 'Justificatif de domicile', 'Relevé d\'identité bancaire'],
    documents: ['CIN', 'Justificatif de domicile', 'RIB'],
    fees: 20,
    isActive: true
  },
  {
    name: 'Change devises',
    description: 'Changez vos devises aux meilleurs taux du marché',
    category: 'change_et_devises',
    subcategory: 'change',
    duration: 15,
    requirements: ['Carte d\'identité nationale', 'Pièces d\'identité des devises'],
    documents: ['CIN', 'Justificatif de provenance des devises'],
    fees: 5,
    isActive: true
  }
];

const sampleAgencies = [
  {
    name: 'Agence Centrale Tunis',
    code: 'BNA-001',
    address: {
      street: '1 Avenue Habib Bourguiba',
      city: 'Tunis',
      zipCode: '1000',
      governorate: 'Tunis',
      coordinates: {
        lat: 36.8065,
        lng: 10.1815
      }
    },
    contact: {
      phone: '71 123 456',
      email: 'central.tunis@bna.tn',
      fax: '71 123 457'
    },
    openingHours: [
      { day: 'Lundi', hours: '8:00 - 16:30' },
      { day: 'Mardi', hours: '8:00 - 16:30' },
      { day: 'Mercredi', hours: '8:00 - 16:30' },
      { day: 'Jeudi', hours: '8:00 - 16:30' },
      { day: 'Vendredi', hours: '8:00 - 16:30' },
      { day: 'Samedi', hours: '8:00 - 12:00' },
      { day: 'Dimanche', hours: 'Fermé' }
    ],
    facilities: ['guichet_automatique', 'parking', 'accessibilite_pmr', 'wifi', 'zone_attente'],
    capacity: {
      daily: 150,
      simultaneous: 30
    },
    isActive: true
  },
  {
    name: 'Agence Sousse Centre',
    code: 'BNA-002',
    address: {
      street: '25 Avenue Farhat Hached',
      city: 'Sousse',
      zipCode: '4000',
      governorate: 'Sousse',
      coordinates: {
        lat: 35.8256,
        lng: 10.6369
      }
    },
    contact: {
      phone: '73 234 567',
      email: 'sousse.centre@bna.tn',
      fax: '73 234 568'
    },
    openingHours: [
      { day: 'Lundi', hours: '8:00 - 16:30' },
      { day: 'Mardi', hours: '8:00 - 16:30' },
      { day: 'Mercredi', hours: '8:00 - 16:30' },
      { day: 'Jeudi', hours: '8:00 - 16:30' },
      { day: 'Vendredi', hours: '8:00 - 16:30' },
      { day: 'Samedi', hours: '8:00 - 12:00' },
      { day: 'Dimanche', hours: 'Fermé' }
    ],
    facilities: ['guichet_automatique', 'parking', 'wifi', 'zone_attente'],
    capacity: {
      daily: 100,
      simultaneous: 20
    },
    isActive: true
  },
  {
    name: 'Agence Sfax Nord',
    code: 'BNA-003',
    address: {
      street: '10 Route de l\'Aéroport',
      city: 'Sfax',
      zipCode: '3000',
      governorate: 'Sfax',
      coordinates: {
        lat: 34.7406,
        lng: 10.7603
      }
    },
    contact: {
      phone: '74 345 678',
      email: 'sfax.nord@bna.tn',
      fax: '74 345 679'
    },
    openingHours: [
      { day: 'Lundi', hours: '8:00 - 16:30' },
      { day: 'Mardi', hours: '8:00 - 16:30' },
      { day: 'Mercredi', hours: '8:00 - 16:30' },
      { day: 'Jeudi', hours: '8:00 - 16:30' },
      { day: 'Vendredi', hours: '8:00 - 16:30' },
      { day: 'Samedi', hours: '8:00 - 12:00' },
      { day: 'Dimanche', hours: 'Fermé' }
    ],
    facilities: ['guichet_automatique', 'parking', 'accessibilite_pmr', 'wifi', 'zone_attente', 'caveau_fort'],
    capacity: {
      daily: 120,
      simultaneous: 25
    },
    isActive: true
  }
];

// Seed function
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bna_platform');
    console.log('Connecté à MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Service.deleteMany({});
    await Agency.deleteMany({});
    console.log('Base de données nettoyée');

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      createdUsers.push(user);
    }
    console.log('Utilisateurs créés:', createdUsers.length);

    // Create services
    const createdServices = [];
    for (const serviceData of sampleServices) {
      const service = new Service(serviceData);
      await service.save();
      createdServices.push(service);
    }
    console.log('Services créés:', createdServices.length);

    // Create agencies
    const createdAgencies = [];
    for (const agencyData of sampleAgencies) {
      // Assign random services to agencies
      const agencyServices = createdServices.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      const agency = new Agency({
        ...agencyData,
        services: agencyServices.map(s => s._id)
      });
      await agency.save();
      createdAgencies.push(agency);
    }
    console.log('Agences créées:', createdAgencies.length);

    // Update agencies with services references
    for (let i = 0; i < createdAgencies.length; i++) {
      const agency = createdAgencies[i];
      const randomServices = createdServices.sort(() => 0.5 - Math.random()).slice(0, 3);
      agency.services = randomServices.map(s => s._id);
      await agency.save();
    }

    console.log('Base de données peuplée avec succès!');
    console.log('\nComptes de démonstration:');
    console.log('Client: client@bna.tn / client123');
    console.log('Agent: agent@bna.tn / agent123');
    console.log('Admin: admin@bna.tn / admin123');

  } catch (error) {
    console.error('Erreur lors du peuplement:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnexion de MongoDB');
  }
};

// Run seed if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
