const express = require('express');
const router = express.Router();
const checkupController = require('../controllers/checkupController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// read checkup hari ini (semua meja bisa lihat)
router.get('/', authenticate, authorize('meja1','meja2','meja3','meja4','meja5'), checkupController.getCheckupsToday);

// update checkup sesuai meja login
router.put('/:id', authenticate, authorize('meja2','meja3','meja4','meja5'), checkupController.updateCheckup);

module.exports = router;
