const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./User');
const Pasien = require('./pasien');
const { CheckupSession } = require('./CheckupSession');
const { Measurement } = require('./Measurement');

// ========== DEFINISI RELASI ==========

// User Relations
User.hasMany(CheckupSession, {
  foreignKey: 'created_by_id',
  as: 'checkup_sessions_created'
});
CheckupSession.belongsTo(User, {
  foreignKey: 'created_by_id',
  as: 'created_by'
});

User.hasMany(Measurement, {
  foreignKey: 'created_by_id',
  as: 'measurements_created'
});
Measurement.belongsTo(User, {
  foreignKey: 'created_by_id',
  as: 'created_by'
});

User.hasMany(Measurement, {
  foreignKey: 'updated_by_id',
  as: 'measurements_updated'
});
Measurement.belongsTo(User, {
  foreignKey: 'updated_by_id',
  as: 'updated_by'
});

// Pasien Relations
Pasien.hasMany(CheckupSession, {
  foreignKey: 'patient_id',
  as: 'checkup_sessions'
});
CheckupSession.belongsTo(Pasien, {
  foreignKey: 'patient_id',
  as: 'patient'
});

// CheckupSession Relations
CheckupSession.hasMany(Measurement, {
  foreignKey: 'checkup_session_id',
  as: 'measurements'
});
Measurement.belongsTo(CheckupSession, {
  foreignKey: 'checkup_session_id',
  as: 'checkup_session'
});

// ========== SEEDER FUNCTION ==========

const seedUsers = async () => {
  try {
    const userCount = await User.count();

    // hanya buat user default jika tabel masih kosong
    if (userCount === 0) {
      const defaultUsers = [
        { username: 'meja1', role: 'meja1', nama_lengkap: 'Admin Meja 1' },
        { username: 'meja2', role: 'meja2', nama_lengkap: 'Operator Meja 2' },
        { username: 'meja3', role: 'meja3', nama_lengkap: 'Operator Meja 3' },
        { username: 'meja4', role: 'meja4', nama_lengkap: 'Operator Meja 4' },
      ];

      for (const userData of defaultUsers) {
        const hash = await bcrypt.hash('password123', 10);
        await User.create({
          ...userData,
          password: hash,
          is_active: true
        });
        console.log(`✅ Created default user: ${userData.username} (password: password123)`);
      }
    } else {
      console.log('ℹ️ Default users already exist — skipping seeding.');
    }
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
  }
};

// ========== SYNC DATABASE ==========

sequelize.sync({ alter: true })
  .then(async () => {
    console.log('✅ Database synced with force: true');
    await seedUsers();
  })
  .catch(err => {
    console.error('❌ Error syncing database:', err.message);
  });

module.exports = {
  sequelize,
  User,
  Pasien,
  CheckupSession,
  Measurement
};
