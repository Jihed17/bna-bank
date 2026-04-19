const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Service = require('../models/Service');
const Agency = require('../models/Agency');
const Appointment = require('../models/Appointment');
const router = express.Router();

// Get admin statistics
router.get('/statistics', auth, authorize('administrateur'), async (req, res) => {
  try {
    const [
      totalUsers,
      totalServices,
      totalAgencies,
      totalAppointments
    ] = await Promise.all([
      User.countDocuments(),
      Service.countDocuments({ isActive: true }),
      Agency.countDocuments({ isActive: true }),
      Appointment.countDocuments()
    ]);

    res.json({
      statistics: {
        totalUsers,
        totalServices,
        totalAgencies,
        totalAppointments
      }
    });
  } catch (error) {
    console.error('Error getting admin statistics:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
