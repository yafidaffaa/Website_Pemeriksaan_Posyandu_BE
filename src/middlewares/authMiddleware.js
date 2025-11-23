const jwt = require('jsonwebtoken');
const { User } = require('../models');

const loginAttempts = new Map();

const loginRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 100;

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  const record = loginAttempts.get(ip);

  if (now - record.firstAttempt > windowMs) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return next();
  }

  if (record.count >= maxAttempts) {
    const timeLeft = Math.ceil((windowMs - (now - record.firstAttempt)) / 1000 / 60);
    return res.status(429).json({ 
      success: false,
      message: `Too many login attempts. Try again in ${timeLeft} minutes` 
    });
  }

  record.count++;
  loginAttempts.set(ip, record);
  next();
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'role', 'nama_lengkap', 'is_active']
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      nama_lengkap: user.nama_lengkap
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    return res.status(500).json({ 
      success: false,
      message: 'Authentication error', 
      error: err.message 
    });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Unauthorized: No user data' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Forbidden: Role ${req.user.role} not allowed. Required: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};

const onlyMeja1 = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Unauthorized' 
    });
  }

  if (req.user.role !== 'meja1') {
    return res.status(403).json({ 
      success: false,
      message: 'Forbidden: Only Meja1 can access this resource' 
    });
  }
  next();
};

const onlyOperator = (req, res, next) => {
  const operatorRoles = ['meja2', 'meja3', 'meja4', 'meja5'];
  
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Unauthorized' 
    });
  }

  if (!operatorRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      message: 'Forbidden: Only operator meja (meja2-meja5) can input measurements' 
    });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'role', 'nama_lengkap', 'is_active']
    });

    if (user && user.is_active) {
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        nama_lengkap: user.nama_lengkap
      };
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

module.exports = {
  loginRateLimit,
  authenticate,
  authorize,
  onlyMeja1,
  onlyOperator,
  optionalAuth
};