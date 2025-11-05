const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  username: { 
    type: DataTypes.STRING(50), 
    unique: true, 
    allowNull: false 
  },
  password: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },
  role: { 
    type: DataTypes.ENUM('meja1', 'meja2', 'meja3', 'meja4'),
    allowNull: false
  },
  nama_lengkap: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = User;