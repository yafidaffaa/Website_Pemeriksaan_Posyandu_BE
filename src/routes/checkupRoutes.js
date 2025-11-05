const express = require('express');
const router = express.Router();
const checkupController = require('../controllers/checkupController');
const { 
  authenticate, 
  authorize 
} = require('../middlewares/authMiddleware');
const { 
  validateDateFormat 
} = require('../middlewares/errorHandlerMiddleware');

// ==================== CHECKUP ROUTES ====================

// ==========================================
// 1. GET CHECKUP QUEUE
// ==========================================
// GET /api/checkup?month=01&year=2024&patientType=ibu_hamil&page=1&limit=50
// Semua meja boleh lihat antrian (meja1, meja2, meja3, meja4, meja5)
// Query params: month, year, patientType, page, limit (semua optional)
router.get('/', 
  authenticate,                              // Validasi token
  authorize('meja1', 'meja2', 'meja3', 'meja4', 'meja5'),  // Semua meja bisa lihat
  checkupController.getCheckupQueue
);

// ==========================================
// 2. MARK CHECKUP AS COMPLETED
// ==========================================
// PUT /api/checkup/complete/:id
// Hanya Meja1 yang bisa mark complete
// Body: kosong (tidak perlu validasi body)
router.put('/complete/:id', 
  authenticate,              // Validasi token
  authorize('meja1'),        // Hanya Meja1
  checkupController.markCheckupCompleted
);

// ==========================================
// 3. DELETE CHECKUP SESSION
// ==========================================
// DELETE /api/checkup/:id
// Hanya Meja1 yang bisa delete antrian
router.delete('/:id', 
  authenticate,              // Validasi token
  authorize('meja1'),        // Hanya Meja1
  checkupController.deleteCheckupSession
);

module.exports = router;