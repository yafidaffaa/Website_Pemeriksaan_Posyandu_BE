const express = require('express');
const router = express.Router();
const pemeriksaanController = require('../controllers/pemeriksaanController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// read semua pemeriksaan (hanya meja1)
router.get('/', authenticate, authorize('meja1'), pemeriksaanController.getAllPemeriksaan);

// filter kategori + tanggal
router.get('/filter', authenticate, authorize('meja1'), pemeriksaanController.getByKategoriAndDate);

// cari pasien untuk statistik
router.get('/statistik', authenticate, authorize('meja1'), pemeriksaanController.findByPasienName);

// export excel kelurahan
router.get('/export/kelurahan', authenticate, authorize('meja1'), pemeriksaanController.exportKelurahan);

// export excel puskesmas
router.get('/export/puskesmas', authenticate, authorize('meja1'), pemeriksaanController.exportPuskesmas);

module.exports = router;
