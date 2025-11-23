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

router.post('/', 
  authenticate,           
  onlyMeja1,                 
  validateBody(['username', 'password', 'role', 'nama_lengkap']),  
  userController.createUser
);

router.get('/', 
  authenticate,            
  onlyMeja1,                
  userController.getAllUsers
);

router.get('/:id', 
  authenticate,              
  onlyMeja1,                 
  userController.getUserById
);

router.put('/:id', 
  authenticate,              
  onlyMeja1,                 
  userController.updateUser
);

router.delete('/:id', 
  authenticate,              
  onlyMeja1,                 
  userController.deleteUser
);

router.delete('/hard/:id', 
  authenticate,              
  onlyMeja1,                 
  userController.hardDeleteUser
);

module.exports = router;