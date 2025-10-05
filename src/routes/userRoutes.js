const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// hanya meja1 (pendaftaran) yang bisa kelola user
router.post('/', authenticate, authorize('meja1'), userController.createUser);
router.get('/', authenticate, authorize('meja1'), userController.getAllUsers);
router.get('/:id', authenticate, authorize('meja1'), userController.getUserById);
router.put('/:id', authenticate, authorize('meja1'), userController.updateUser);
router.delete('/:id', authenticate, authorize('meja1'), userController.deleteUser);

module.exports = router;
