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

router.get('/', 
  authenticate,                            
  authorize('meja1', 'meja2', 'meja3', 'meja4', 'meja5'),  
  checkupController.getCheckupQueue
);

router.put('/complete/:id', 
  authenticate,             
  authorize('meja1'),        
  checkupController.markCheckupCompleted
);

router.delete('/:id', 
  authenticate,             
  authorize('meja1'),        
  checkupController.deleteCheckupSession
);

module.exports = router;