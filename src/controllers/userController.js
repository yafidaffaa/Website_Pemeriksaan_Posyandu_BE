const bcrypt = require('bcryptjs');
const { User, Pasien, CheckupSession } = require('../models');

// ==========================================
// CREATE User
// ==========================================
const createUser = async (req, res, next) => {
  try {
    const { username, password, role, nama_lengkap } = req.body;

    // Cek apakah username sudah exist
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create({ 
      username, 
      password: hash, 
      role,
      nama_lengkap,
      is_active: true
    });
    
    // Response tanpa password
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
        is_active: user.is_active,
        created_at: user.created_at
      }
    });
  } catch (err) {
    next(err);  // Pass ke error handler
  }
};

// ==========================================
// GET ALL Users
// ==========================================
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({ 
      attributes: ['id', 'username', 'role', 'nama_lengkap', 'is_active', 'created_at', 'updated_at']
    });

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);  // Pass ke error handler
  }
};

// ==========================================
// GET User by ID
// ==========================================
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, { 
      attributes: ['id', 'username', 'role', 'nama_lengkap', 'is_active', 'created_at', 'updated_at']
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (err) {
    next(err);  // Pass ke error handler
  }
};

// ==========================================
// UPDATE User
// ==========================================
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, role, nama_lengkap, is_active } = req.body;

    // Cek user exist
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Jika username diubah, cek apakah sudah ada user dengan username baru
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      user.username = username;
    }

    // Update field lainnya
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    if (role) user.role = role;
    if (nama_lengkap) user.nama_lengkap = nama_lengkap;
    if (typeof is_active !== 'undefined') user.is_active = is_active;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        nama_lengkap: user.nama_lengkap,
        is_active: user.is_active,
        updated_at: user.updated_at
      }
    });
  } catch (err) {
    next(err);  // Pass ke error handler
  }
};

// ==========================================
// DELETE User (Soft Delete)
// ==========================================
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete - set is_active = false
    user.is_active = false;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        id: user.id,
        username: user.username,
        is_active: user.is_active
      }
    });
  } catch (err) {
    next(err);  // Pass ke error handler
  }
};

// ==========================================
// HARD DELETE User (Permanen dari Database)
// ==========================================
const hardDeleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await User.destroy({ where: { id } });
    
    if (result === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User permanently deleted',
      data: {
        deleted_id: id
      }
    });
  } catch (err) {
    next(err);  // Pass ke error handler
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  hardDeleteUser
};