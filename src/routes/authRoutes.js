const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { 
  authenticate, 
  loginRateLimit 
} = require('../middlewares/authMiddleware');
const { 
  validateBody 
} = require('../middlewares/errorHandlerMiddleware');

// ==================== AUTH ROUTES ====================

// ==========================================
// 1. LOGIN ROUTE
// ==========================================
// POST /api/auth/login
// PUBLIC route (no authenticate needed)
// Middleware: loginRateLimit + validateBody
router.post('/login',
  loginRateLimit,                              // Rate limit: 100 attempts per 15 min
  validateBody(['username', 'password']),      // Validasi required fields
  authController.login
);

// ==========================================
// 2. LOGOUT ROUTE (Optional)
// ==========================================
// POST /api/auth/logout
// PROTECTED route (need authentication)
router.post('/logout',
  authenticate,                                // Validasi token
  authController.logout
);

// ==========================================
// 3. REFRESH TOKEN (Optional)
// ==========================================
// POST /api/auth/refresh
// PROTECTED route (need authentication)
// Gunakan token lama untuk mendapat token baru
router.post('/refresh',
  authenticate,                                // Validasi token
  authController.refreshToken
);

module.exports = router;