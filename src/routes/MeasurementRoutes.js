const express = require('express');
const router = express.Router();
const measurementController = require('../controllers/MeasurementController');
const { 
  authenticate, 
  authorize 
} = require('../middlewares/authMiddleware');
const { 
  validateDateFormat,
  validateMeasurementInput
} = require('../middlewares/errorHandlerMiddleware');

// ==================== MEASUREMENT ROUTES ====================

router.get(
  '/statistics/stunting',
  authenticate,
  authorize('meja1', 'meja2', 'meja3'),
  measurementController.getStuntingStatistics
);

router.get(
  '/statistics/trends',
  authenticate,
  authorize('meja1', 'meja2', 'meja3'),
  measurementController.getStuntingTrends
);

router.get(
  '/export/kelurahan',
  authenticate,
  authorize('meja1'),
  validateDateFormat([]),
  measurementController.exportKelurahan
);

router.get(
  '/export/puskesmas',
  authenticate,
  authorize('meja1'),
  measurementController.exportPuskesmas
);

router.get(
  '/export/penerima-manfaat',
  authenticate,
  authorize('meja1'),
  validateDateFormat([]),
  measurementController.exportPenerimaManfaat
);

router.get(
  '/edit/:checkupSessionId',
  authenticate,
  authorize('meja2', 'meja3'),
  measurementController.getMeasurementForEdit
);

router.get(
  '/session/:checkupSessionId',
  authenticate,
  authorize('meja1', 'meja2', 'meja3'),
  measurementController.getMeasurementBySession
);

router.get(
  '/',
  authenticate,
  authorize('meja1'),
  measurementController.getAllMeasurements
);

router.get(
  '/:id',
  authenticate,
  authorize('meja1'),
  measurementController.getMeasurementById
);

router.post(
  '/:checkupSessionId',
  authenticate,
  authorize('meja2', 'meja3'),
  validateMeasurementInput,
  measurementController.upsertMeasurement
);

module.exports = router;