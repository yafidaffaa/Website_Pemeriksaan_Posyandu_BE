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

// ==========================================
// 8. GET STUNTING STATISTICS (PIE CHART)
// ==========================================
// GET /api/measurement/statistics/stunting?patientType=balita
// Semua meja bisa akses untuk dashboard
router.get(
  '/statistics/stunting',
  authenticate,
  authorize('meja1', 'meja2', 'meja3'),
  measurementController.getStuntingStatistics
);

// ==========================================
// 9. GET STUNTING TRENDS (BAR CHART)
// ==========================================
// GET /api/measurement/statistics/trends?month=1&year=2025
// Semua meja bisa akses untuk dashboard
router.get(
  '/statistics/trends',
  authenticate,
  authorize('meja1', 'meja2', 'meja3'),
  measurementController.getStuntingTrends
);

// ==========================================
// 6. EXPORT KELURAHAN
// ==========================================
// GET /api/measurement/export/kelurahan?month=01&year=2024&patientType=balita
// Hanya Meja1 yang bisa export
router.get(
  '/export/kelurahan',
  authenticate,
  authorize('meja1'),
  validateDateFormat([]),
  measurementController.exportKelurahan
);

// ==========================================
// 7. EXPORT PUSKESMAS
// ==========================================
// GET /api/measurement/export/puskesmas?month=01&year=2024&patientType=ibu_hamil
// Hanya Meja1 yang bisa export
router.get(
  '/export/puskesmas',
  authenticate,
  authorize('meja1'),
  measurementController.exportPuskesmas
);

// ==========================================
// EXPORT PENERIMA MANFAAT (IBU HAMIL)
// ==========================================
// GET /api/measurement/export/penerima-manfaat?month=01&year=2024
// Hanya Meja1 yang bisa export
router.get(
  '/export/penerima-manfaat',
  authenticate,
  authorize('meja1'),
  validateDateFormat([]),
  measurementController.exportPenerimaManfaat
);

// ==========================================
// 2. GET MEASUREMENT FOR EDIT
// ==========================================
// GET /api/measurement/edit/:checkupSessionId
// Hanya Meja2-3 yang bisa edit form
router.get(
  '/edit/:checkupSessionId',
  authenticate,
  authorize('meja2', 'meja3'),
  measurementController.getMeasurementForEdit
);

// ==========================================
// 3. GET MEASUREMENT BY SESSION
// ==========================================
// GET /api/measurement/session/:checkupSessionId
// Semua meja bisa lihat measurement
router.get(
  '/session/:checkupSessionId',
  authenticate,
  authorize('meja1', 'meja2', 'meja3'),
  measurementController.getMeasurementBySession
);

// ==========================================
// 4. GET ALL MEASUREMENTS (LIST)
// ==========================================
// GET /api/measurement?month=01&year=2024&patientType=balita&page=1&limit=50
// Hanya Meja1 yang bisa lihat list semua measurement
router.get(
  '/',
  authenticate,
  authorize('meja1'),
  measurementController.getAllMeasurements
);

// ==========================================
// 5. GET MEASUREMENT BY ID
// ==========================================
// GET /api/measurement/:id
// Hanya Meja1 yang bisa lihat detail measurement
router.get(
  '/:id',
  authenticate,
  authorize('meja1'),
  measurementController.getMeasurementById
);

// ==========================================
// 1. UPSERT MEASUREMENT (CREATE/UPDATE)
// ==========================================
// POST /api/measurement/:checkupSessionId
// Hanya Meja2-3 yang bisa input measurement
router.post(
  '/:checkupSessionId',
  authenticate,
  authorize('meja2', 'meja3'),
  validateMeasurementInput,
  measurementController.upsertMeasurement
);

module.exports = router;