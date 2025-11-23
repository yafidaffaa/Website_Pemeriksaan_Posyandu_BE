const { User } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi',
      });
    }

    if (username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username minimal 3 karakter',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 6 karakter',
      });
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Username tidak ditemukan',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun ini tidak aktif, silakan hubungi admin',
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Password yang Anda masukkan salah',
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          nama_lengkap: user.nama_lengkap,
          is_active: user.is_active,
        },
      },
    });
  } catch (err) {
    console.error('Terjadi kesalahan saat login:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    });
  }
};

const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logout berhasil',
  });
};

const refreshToken = async (req, res, next) => {
  try {
    const user = req.user;

    const userDb = await User.findByPk(user.id);
    if (!userDb || !userDb.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Pengguna tidak aktif atau tidak ditemukan',
      });
    }

    const newToken = jwt.sign(
      {
        id: userDb.id,
        username: userDb.username,
        role: userDb.role,
        nama_lengkap: userDb.nama_lengkap,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      success: true,
      message: 'Token berhasil diperbarui',
      data: {
        token: newToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  logout,
  refreshToken,
};
