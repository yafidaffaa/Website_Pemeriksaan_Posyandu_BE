const express = require('express');
const router = express.Router();
const pasienController = require('../controllers/PasienController');
const { 
  authenticate, 
  onlyMeja1 
} = require('../middlewares/authMiddleware');
const { 
  validateBody, 
  validatePasienType,
  validateDateFormat
} = require('../middlewares/errorHandlerMiddleware');

// ==================== PASIEN ROUTES ====================

// ==========================================
// 1. CREATE PASIEN - Hanya Meja1
// ==========================================
// POST /api/pasien
// Body untuk Balita: { patientType, name, birthDate, gender, address, motherName, rt, kb, pus, wus, imunisasi }
// Body untuk Ibu Hamil: { patientType, name, birthDate, gender, address, rt, nik, noKK, namaSuami, gravida, partus, abortus, jarakPersalinanSebelumnya, usiaKandunganMinggu, tglPemeriksaanPertama, hpm, hpl, nomorJaminan, noTelp }
router.post('/', 
  authenticate,                                           // Validasi token
  onlyMeja1,                                             // Hanya Meja1
  validateBody(['patientType', 'name', 'birthDate']),   // Validasi required fields
  validatePasienType,                                    // Validasi patientType (balita atau ibu_hamil)
  validateDateFormat(['birthDate']),                     // Validasi format tanggal
  pasienController.createPasien
);

// ==========================================
// 2. GET ALL PASIEN - Hanya Meja1
// ==========================================
// GET /api/pasien?patientType=balita&name=Ahmad&page=1&limit=10
// Query params: patientType, name, page, limit (optional)
router.get('/', 
  authenticate,   // Validasi token
  onlyMeja1,      // Hanya Meja1
  pasienController.getAllPasien
);

router.get('/statistik', 
  authenticate,                  // Semua role bisa akses
  pasienController.getStatistikPasien
);

// ==========================================
// 3. GET PASIEN BY ID - Hanya Meja1
// ==========================================
// GET /api/pasien/:id
router.get('/:id', 
  authenticate,   // Validasi token
  onlyMeja1,      // Hanya Meja1
  pasienController.getPasienById
);

// ==========================================
// 4. UPDATE PASIEN - Hanya Meja1
// ==========================================
// PUT /api/pasien/:id
// Body: tergantung patientType, optional fields
router.put('/:id', 
  authenticate,              // Validasi token
  onlyMeja1,                 // Hanya Meja1
  validatePasienType,        // Validasi patientType jika diubah (optional)
  validateDateFormat(['birthDate', 'tglPemeriksaanPertama', 'hpm', 'hpl']), // Validasi tanggal jika ada
  pasienController.updatePasien
);

// ==========================================
// 5. DELETE PASIEN - Hanya Meja1
// ==========================================
// DELETE /api/pasien/:id
router.delete('/:id', 
  authenticate,   // Validasi token
  onlyMeja1,      // Hanya Meja1
  pasienController.deletePasien
);

// ==========================================
// 6. ADD PASIEN TO QUEUE - Hanya Meja1
// ==========================================
// POST /api/pasien/add-to-queue
// Body: { pasienId, tanggal? }
// Note: Endpoint ini HARUS sebelum GET /:id agar tidak conflict
router.post('/add-to-queue', 
  authenticate,                              // Validasi token
  onlyMeja1,                                 // Hanya Meja1
  validateBody(['pasienId']),                // Validasi pasienId wajib
  validateDateFormat(['tanggal']),           // Validasi format tanggal jika ada
  pasienController.addPasienToQueue
);

module.exports = router;