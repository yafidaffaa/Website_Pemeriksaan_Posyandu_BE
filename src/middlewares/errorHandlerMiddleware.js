/**
 * ========== MIDDLEWARE COLLECTION ==========
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

const validateBody = (requiredFields = []) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(
      field => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Field berikut wajib diisi: ${missingFields.join(', ')}`,
        missingFields,
        suggestion: 'Pastikan semua field yang diperlukan sudah diisi dengan lengkap.'
      });
    }

    return next();
  };
};

const validatePasienType = (req, res, next) => {
  const { patientType } = req.body;
  
  if (patientType && !['balita', 'ibu_hamil'].includes(patientType)) {
    return res.status(400).json({ 
      success: false,
      message: 'Tipe pasien tidak valid. Harus "balita" atau "ibu_hamil"',
      error: 'INVALID_PATIENT_TYPE',
      suggestion: 'Gunakan "balita" untuk anak usia 0-5 tahun atau "ibu_hamil" untuk ibu hamil.'
    });
  }

  return next();
};

const validateDateFormat = (dateFields = []) => {
  return (req, res, next) => {
    const invalidDates = [];
    
    for (const field of dateFields) {
      const dateValue = req.body[field] || req.query[field] || req.params[field];
      
      if (dateValue) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        if (!dateRegex.test(dateValue)) {
          invalidDates.push(`${field} (format harus YYYY-MM-DD, contoh: 2024-01-15)`);
          continue;
        }

        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          invalidDates.push(`${field} (tanggal tidak valid)`);
        }
      }
    }

    if (invalidDates.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Format tanggal tidak valid',
        invalidFields: invalidDates,
        error: 'INVALID_DATE_FORMAT',
        suggestion: 'Gunakan format YYYY-MM-DD, contoh: 2024-11-04'
      });
    }

    return next();
  };
};

const validateQueryParams = (req, res, next) => {
  try {
    const { month, year, page, limit } = req.query;

    if (month !== undefined) {
      const monthNum = parseInt(month);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          message: 'Bulan tidak valid. Harus antara 1-12.',
          error: 'INVALID_MONTH',
          suggestion: 'Gunakan angka 1 untuk Januari, 2 untuk Februari, dst.'
        });
      }
    }

    if (year !== undefined) {
      const yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
          success: false,
          message: 'Tahun tidak valid. Harus antara 2000-2100.',
          error: 'INVALID_YEAR',
          suggestion: 'Gunakan format tahun 4 digit, contoh: 2024'
        });
      }
    }

    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({
          success: false,
          message: 'Nomor halaman tidak valid. Harus lebih dari 0.',
          error: 'INVALID_PAGE',
          suggestion: 'Gunakan angka positif untuk halaman, contoh: 1, 2, 3'
        });
      }
    }

    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Limit tidak valid. Harus antara 1-1000.',
          error: 'INVALID_LIMIT',
          suggestion: 'Gunakan angka antara 1-1000 untuk jumlah data per halaman'
        });
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

const validateMeasurementInput = (req, res, next) => {
  try {
    const { 
      weightKg, 
      heightCm, 
      ageMonths,
      weightKgPregnant,
      heightCmPregnant,
      ageMonthsPregnant,
      headCircCm,
      lilaCm,
      lilaCmPregnant,
      tekananDarah,
      HB,
      gds
    } = req.body;

    const errors = [];

    if (weightKg !== undefined && weightKg !== null && weightKg !== '') {
      const weight = parseFloat(weightKg);
      if (isNaN(weight)) {
        errors.push('Berat badan balita harus berupa angka');
      } else if (weight <= 0) {
        errors.push('Berat badan balita harus lebih dari 0 kg');
      } else if (weight > 100) {
        errors.push('Berat badan balita terlalu besar (maksimal 100 kg)');
      }
    }

    if (heightCm !== undefined && heightCm !== null && heightCm !== '') {
      const height = parseFloat(heightCm);
      if (isNaN(height)) {
        errors.push('Tinggi badan balita harus berupa angka');
      } else if (height <= 0) {
        errors.push('Tinggi badan balita harus lebih dari 0 cm');
      } else if (height > 200) {
        errors.push('Tinggi badan balita terlalu tinggi (maksimal 200 cm)');
      }
    }

    if (ageMonths !== undefined && ageMonths !== null && ageMonths !== '') {
      const age = parseFloat(ageMonths);
      if (isNaN(age)) {
        errors.push('Umur balita harus berupa angka');
      } else if (age < 0) {
        errors.push('Umur balita tidak boleh negatif');
      } else if (age > 60) {
        errors.push('Umur balita terlalu besar (maksimal 60 bulan / 5 tahun)');
      }
    }

    if (weightKgPregnant !== undefined && weightKgPregnant !== null && weightKgPregnant !== '') {
      const weight = parseFloat(weightKgPregnant);
      if (isNaN(weight)) {
        errors.push('Berat badan ibu hamil harus berupa angka');
      } else if (weight <= 0) {
        errors.push('Berat badan ibu hamil harus lebih dari 0 kg');
      } else if (weight > 200) {
        errors.push('Berat badan ibu hamil terlalu besar (maksimal 200 kg)');
      }
    }

    if (heightCmPregnant !== undefined && heightCmPregnant !== null && heightCmPregnant !== '') {
      const height = parseFloat(heightCmPregnant);
      if (isNaN(height)) {
        errors.push('Tinggi badan ibu hamil harus berupa angka');
      } else if (height <= 0) {
        errors.push('Tinggi badan ibu hamil harus lebih dari 0 cm');
      } else if (height > 250) {
        errors.push('Tinggi badan ibu hamil terlalu tinggi (maksimal 250 cm)');
      }
    }

    if (ageMonthsPregnant !== undefined && ageMonthsPregnant !== null && ageMonthsPregnant !== '') {
      const age = parseFloat(ageMonthsPregnant);
      if (isNaN(age)) {
        errors.push('Usia kehamilan harus berupa angka');
      } else if (age < 0) {
        errors.push('Usia kehamilan tidak boleh negatif');
      } else if (age > 9) {
        errors.push('Usia kehamilan terlalu besar (maksimal 9 bulan)');
      }
    }

    if (headCircCm !== undefined && headCircCm !== null && headCircCm !== '') {
      const head = parseFloat(headCircCm);
      if (isNaN(head)) {
        errors.push('Lingkar kepala harus berupa angka');
      } else if (head <= 0 || head > 100) {
        errors.push('Lingkar kepala tidak wajar (harus antara 0-100 cm)');
      }
    }

    if (lilaCm !== undefined && lilaCm !== null && lilaCm !== '') {
      const lila = parseFloat(lilaCm);
      if (isNaN(lila)) {
        errors.push('LILA balita harus berupa angka');
      } else if (lila <= 0 || lila > 50) {
        errors.push('LILA balita tidak wajar (harus antara 0-50 cm)');
      }
    }

    if (lilaCmPregnant !== undefined && lilaCmPregnant !== null && lilaCmPregnant !== '') {
      const lila = parseFloat(lilaCmPregnant);
      if (isNaN(lila)) {
        errors.push('LILA ibu hamil harus berupa angka');
      } else if (lila <= 0 || lila > 50) {
        errors.push('LILA ibu hamil tidak wajar (harus antara 0-50 cm)');
      }
    }

    if (tekananDarah !== undefined && tekananDarah !== null && tekananDarah !== '') {
      const tdRegex = /^\d{2,3}\/\d{2,3}$/;
      if (!tdRegex.test(tekananDarah)) {
        errors.push('Format tekanan darah tidak valid (gunakan format: 120/80)');
      }
    }

    if (HB !== undefined && HB !== null && HB !== '') {
      const hb = parseFloat(HB);
      if (isNaN(hb)) {
        errors.push('HB harus berupa angka');
      } else if (hb < 0 || hb > 30) {
        errors.push('Nilai HB tidak wajar (harus antara 0-30 g/dL)');
      }
    }

    if (gds !== undefined && gds !== null && gds !== '') {
      const gdsVal = parseFloat(gds);
      if (isNaN(gdsVal)) {
        errors.push('GDS harus berupa angka');
      } else if (gdsVal < 0 || gdsVal > 1000) {
        errors.push('Nilai GDS tidak wajar (harus antara 0-1000 mg/dL)');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data pengukuran tidak valid',
        errors,
        error: 'INVALID_MEASUREMENT_DATA',
        suggestion: 'Periksa kembali semua data yang dimasukkan dan pastikan sesuai dengan ketentuan.'
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

const validateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak ditemukan',
        error: 'TOKEN_NOT_PROVIDED',
        suggestion: 'Sertakan token di header Authorization dengan format: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Format token tidak valid',
        error: 'INVALID_TOKEN_FORMAT',
        suggestion: 'Gunakan format: Bearer <token>'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Sesi Anda telah berakhir',
        error: 'TOKEN_EXPIRED',
        suggestion: 'Silakan login kembali untuk melanjutkan.'
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid',
        error: 'INVALID_TOKEN',
        suggestion: 'Token yang Anda gunakan tidak valid. Silakan login kembali.'
      });
    }

    return next(err);
  }
};

const errorHandler = (err, req, res, next) => {
  console.error('🔥 Error Handler:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?.username || 'Guest',
    timestamp: new Date().toISOString()
  });

  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Terjadi kesalahan pada server';
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let suggestion = 'Silakan coba lagi atau hubungi administrator jika masalah berlanjut.';
  
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Data yang dimasukkan tidak valid';
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      error: errorCode,
      suggestion: 'Periksa kembali data yang dimasukkan dan pastikan sesuai dengan format yang benar.'
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    const field = err.errors[0]?.path || 'field';
    const value = err.errors[0]?.value || '';
    message = `Data ${field} dengan nilai "${value}" sudah ada dalam sistem`;
    suggestion = 'Gunakan data yang berbeda atau periksa apakah data sudah terdaftar sebelumnya.';
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    errorCode = 'FOREIGN_KEY_ERROR';
    message = 'Data yang dirujuk tidak ditemukan dalam sistem';
    suggestion = 'Pastikan data yang dirujuk (misalnya ID pasien atau sesi) sudah ada dan valid.';
  }

  if (err.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = 'Terjadi kesalahan pada database';
    suggestion = 'Silakan coba lagi dalam beberapa saat. Jika masalah berlanjut, hubungi administrator.';
  }

  if (err.name === 'SequelizeConnectionError') {
    statusCode = 503;
    errorCode = 'DATABASE_CONNECTION_ERROR';
    message = 'Tidak dapat terhubung ke database';
    suggestion = 'Sistem sedang mengalami gangguan koneksi. Silakan coba lagi dalam beberapa saat.';
  }
  
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Token autentikasi tidak valid';
    suggestion = 'Silakan login kembali untuk mendapatkan token yang valid.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Sesi Anda telah berakhir';
    suggestion = 'Silakan login kembali untuk melanjutkan.';
  }
  
  if (statusCode === 404 || message.toLowerCase().includes('not found')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    suggestion = 'Periksa kembali ID atau parameter yang Anda gunakan.';
  }

  if (statusCode === 403 || message.toLowerCase().includes('forbidden') || message.toLowerCase().includes('tidak memiliki akses')) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    suggestion = 'Anda tidak memiliki akses untuk melakukan aksi ini. Hubungi administrator jika ini adalah kesalahan.';
  }

  if (statusCode === 401) {
    suggestion = 'Silakan login terlebih dahulu untuk mengakses resource ini.';
  }

  if (statusCode === 400) {
    suggestion = 'Periksa kembali data yang Anda masukkan dan pastikan semua field diisi dengan benar.';
  }
  
  if (err.name === 'MulterError') {
    statusCode = 400;
    errorCode = 'FILE_UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Ukuran file terlalu besar';
      suggestion = 'Ukuran maksimal file adalah 5MB. Gunakan file yang lebih kecil.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Terlalu banyak file';
      suggestion = 'Anda hanya dapat mengupload maksimal 10 file sekaligus.';
    } else {
      message = 'Gagal mengupload file';
      suggestion = 'Periksa format dan ukuran file Anda.';
    }
  }
  
  const response = {
    success: false,
    message,
    error: errorCode,
    suggestion,
    timestamp: new Date().toISOString()
  };

  if (process.env.NODE_ENV === 'development') {
    response.details = {
      originalError: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    };
  }

  res.status(statusCode).json(response);
};

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Halaman ${req.originalUrl} tidak ditemukan`,
    error: 'NOT_FOUND',
    suggestion: 'Periksa kembali URL yang Anda akses atau lihat dokumentasi API untuk endpoint yang tersedia.',
    availableEndpoints: {
      auth: '/api/auth/*',
      users: '/api/users/*',
      patients: '/api/patients/*',
      checkups: '/api/checkup-sessions/*',
      measurements: '/api/measurement/*'
    }
  });
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  validateBody,
  validatePasienType,
  validateDateFormat,
  validateQueryParams,
  validateMeasurementInput,
  validateToken,
  errorHandler,
  notFound,
  asyncHandler
};