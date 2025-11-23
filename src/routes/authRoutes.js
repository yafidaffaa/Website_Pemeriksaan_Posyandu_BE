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

router.post('/login',
  loginRateLimit,                            
  validateBody(['username', 'password']),     
  authController.login
);

router.post('/logout',
  authenticate,                              
  authController.logout
);

router.post('/refresh',
  authenticate,                            
  authController.refreshToken
);

module.exports = router;