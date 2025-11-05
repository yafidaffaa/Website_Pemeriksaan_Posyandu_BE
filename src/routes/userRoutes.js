const express = require('express');
const router = express.Router();
const userController = require('../controllers/UserController');
const { 
  authenticate, 
  authorize, 
  onlyMeja1 
} = require('../middlewares/authMiddleware');
const { 
  validateBody, 
  validateDateFormat 
} = require('../middlewares/errorHandlerMiddleware');

// ==================== USER ROUTES ====================

// ==========================================
// PUBLIC ROUTES (Tanpa Auth)
// ==========================================

// Tidak ada public user routes karena user management hanya untuk admin/meja1


// ==========================================
// PROTECTED ROUTES (Hanya Meja1 yang bisa akses)
// ==========================================

// 1. CREATE User - Hanya Meja1
// POST /api/users
// Body: { username, password, role, nama_lengkap }
router.post('/', 
  authenticate,              // Validasi token
  onlyMeja1,                 // Hanya Meja1
  validateBody(['username', 'password', 'role', 'nama_lengkap']),  // Validasi required fields
  userController.createUser
);

// 2. GET ALL Users - Hanya Meja1
// GET /api/users
router.get('/', 
  authenticate,              // Validasi token
  onlyMeja1,                 // Hanya Meja1
  userController.getAllUsers
);

// 3. GET User by ID - Hanya Meja1
// GET /api/users/:id
router.get('/:id', 
  authenticate,              // Validasi token
  onlyMeja1,                 // Hanya Meja1
  userController.getUserById
);

// 4. UPDATE User - Hanya Meja1
// PUT /api/users/:id
// Body: { username?, password?, role?, nama_lengkap?, is_active? }
router.put('/:id', 
  authenticate,              // Validasi token
  onlyMeja1,                 // Hanya Meja1
  userController.updateUser
);

// 5. DELETE User (Soft Delete) - Hanya Meja1
// DELETE /api/users/:id
router.delete('/:id', 
  authenticate,              // Validasi token
  onlyMeja1,                 // Hanya Meja1
  userController.deleteUser
);

// 6. HARD DELETE User (Permanen) - Hanya Meja1
// DELETE /api/users/hard/:id
router.delete('/hard/:id', 
  authenticate,              // Validasi token
  onlyMeja1,                 // Hanya Meja1
  userController.hardDeleteUser
);

module.exports = router;