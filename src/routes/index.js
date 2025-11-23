const express = require('express');
const router = express.Router();

const authRoutes = require('./AuthRoutes');
const userRoutes = require('./userRoutes');
const pasienRoutes = require('./pasienRoutes');
const checkupRoutes = require('./checkupRoutes');
const measurementRoutes = require('./MeasurementRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/pasien', pasienRoutes);
router.use('/checkup', checkupRoutes);
router.use('/measurement', measurementRoutes);

module.exports = router;
