const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');

const User = require('./User');
const Pasien = require('./pasien');
const { CheckupSession } = require('./CheckupSession');
const { Measurement } = require('./Measurement');

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

Pasien.hasMany(CheckupSession, {
  foreignKey: 'patient_id',
  as: 'checkup_sessions'
});
CheckupSession.belongsTo(Pasien, {
  foreignKey: 'patient_id',
  as: 'patient'
});

CheckupSession.hasMany(Measurement, {
  foreignKey: 'checkup_session_id',
  as: 'measurements'
});
Measurement.belongsTo(CheckupSession, {
  foreignKey: 'checkup_session_id',
  as: 'checkup_session'
});

const seedUsers = async () => {
  try {
    const userCount = await User.count();

    if (userCount === 0) {
      const defaultUsers = [];

      for (let i = 1; i <= 3; i++) {
        const username = process.env[`SEED_USER_${i}_USERNAME`];
        const role = process.env[`SEED_USER_${i}_ROLE`];
        const nama_lengkap = process.env[`SEED_USER_${i}_NAME`];
        const password = process.env[`SEED_USER_${i}_PASSWORD`] || 'password123';

        if (username && role && nama_lengkap) {
          defaultUsers.push({ username, role, nama_lengkap, password });
        }
      }

      for (const userData of defaultUsers) {
        const hash = await bcrypt.hash(userData.password, 10);
        await User.create({
          username: userData.username,
          role: userData.role,
          nama_lengkap: userData.nama_lengkap,
          password: hash,
          is_active: true
        });
      }
    }
  } catch (error) {
  }
};

if (process.env.NODE_ENV === 'production' || process.env.DB_SYNC === 'true') {

  sequelize.sync({ alter: false })
    .then(async () => {
      await seedUsers();
      console.log('Database synchronized');
    })
    .catch(err => {
    });
}

module.exports = {
  sequelize,
  User,
  Pasien,
  CheckupSession,
  Measurement
};
