const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// LOGIN
// ==========================================
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Cek user exist
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Cek user aktif
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Validasi password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        nama_lengkap: user.nama_lengkap
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          nama_lengkap: user.nama_lengkap,
          is_active: user.is_active
        }
      }
    });
  } catch (err) {
    next(err);  // Pass ke error handler
  }
};

// ==========================================
// LOGOUT (Optional)
// ==========================================
const logout = async (req, res, next) => {
  try {
    // Logout logic: di JWT tidak ada server-side session
    // Bisa tracking di database jika ingin blacklist token
    // Untuk simple case, cukup return success

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// REFRESH TOKEN (Optional)
// ==========================================
const refreshToken = async (req, res, next) => {
  try {
    const user = req.user;  // Dari authenticate middleware

    // Cek user masih aktif
    const userDb = await User.findByPk(user.id);
    if (!userDb || !userDb.is_active) {
      return res.status(403).json({
        success: false,
        message: 'User no longer active'
      });
    }

    // Generate token baru
    const newToken = jwt.sign(
      {
        id: userDb.id,
        username: userDb.username,
        role: userDb.role,
        nama_lengkap: userDb.nama_lengkap
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  logout,
  refreshToken
};