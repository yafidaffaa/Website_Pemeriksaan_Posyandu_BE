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

router.post('/', 
  authenticate,                                         
  onlyMeja1,                                            
  validateBody(['patientType', 'name', 'birthDate']),  
  validatePasienType,                                   
  validateDateFormat(['birthDate']),                     
  pasienController.createPasien
);

router.get('/', 
  authenticate,  
  onlyMeja1,     
  pasienController.getAllPasien
);

router.get('/statistik', 
  authenticate,                 
  pasienController.getStatistikPasien
);

router.get('/:id', 
  authenticate,   
  onlyMeja1,      
  pasienController.getPasienById
);

router.put('/:id', 
  authenticate,             
  onlyMeja1,               
  validatePasienType,       
  validateDateFormat(['birthDate', 'tglPemeriksaanPertama', 'hpm', 'hpl']), 
  pasienController.updatePasien
);

router.delete('/:id', 
  authenticate,   
  onlyMeja1,      
  pasienController.deletePasien
);

router.post('/add-to-queue', 
  authenticate,                             
  onlyMeja1,                                 
  validateBody(['pasienId']),                
  validateDateFormat(['tanggal']),           
  pasienController.addPasienToQueue
);

module.exports = router;