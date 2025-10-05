const express = require('express');
const router = express.Router();
const pasienController = require('../controllers/pasienController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// CRUD pasien → hanya meja1
router.post('/', authenticate, authorize('meja1'), pasienController.createPasien);
router.get('/', authenticate, authorize('meja1'), pasienController.getAllPasien);
router.get('/:id', authenticate, authorize('meja1'), pasienController.getPasienById);
router.put('/:id', authenticate, authorize('meja1'), pasienController.updatePasien);
router.delete('/:id', authenticate, authorize('meja1'), pasienController.deletePasien);

module.exports = router;
