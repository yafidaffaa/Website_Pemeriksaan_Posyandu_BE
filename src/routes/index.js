const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const pasienRoutes = require('./pasienRoutes');
const checkupRoutes = require('./checkupRoutes');
const measurementRoutes = require('./MeasurementRoutes');

// prefix
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pasien', pasienRoutes);
router.use('/checkup', checkupRoutes);
router.use('/measurement', measurementRoutes);

module.exports = router;
