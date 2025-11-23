const bcrypt = require('bcryptjs');
const { User, Pasien, CheckupSession } = require('../models');

const createUser = async (req, res, next) => {
  try {
    const { username, password, role, nama_lengkap } = req.body;

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    const hash = await bcrypt.hash(password, 10);
    
    const user = await User.create({ 
      username, 
      password: hash, 
      role,
      nama_lengkap,
      is_active: true
    });
    
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
    next(err);
  }
};

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
    next(err); 
  }
};

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
    next(err); 
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, role, nama_lengkap, is_active } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
    next(err);
  }
};

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
    next(err); 
  }
};

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
    next(err);
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