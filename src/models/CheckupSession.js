const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CheckupSession = sequelize.define('CheckupSession', {
  id: { 
    type: DataTypes.INTEGER, 
    autoIncrement: true, 
    primaryKey: true 
  },
  sessionDate: { 
    type: DataTypes.DATEONLY, 
    allowNull: false,
    field: 'session_date'
  },
  completed: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false,
    allowNull: false,
    comment: 'Apakah pemeriksaan sudah selesai semua meja'
  },
  patientId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    field: 'patient_id'
  },
  createdById: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    field: 'created_by_id',
    comment: 'User meja1 yang menambahkan ke antrian'
  }
}, {
  tableName: 'checkup_sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = {CheckupSession};
