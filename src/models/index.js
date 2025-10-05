const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/mysql'); // file koneksi yg sudah dibuat
const bcrypt = require('bcryptjs');

// Import model
const User = require('./user')(sequelize, DataTypes);
const Pasien = require('./pasien')(sequelize, DataTypes);
const Checkup = require('./checkup')(sequelize, DataTypes);
const Pemeriksaan = require('./pemeriksaan')(sequelize, DataTypes);

// Relasi
Pasien.hasMany(Checkup, { foreignKey: 'pasien_id' });
Checkup.belongsTo(Pasien, { foreignKey: 'pasien_id' });

Pasien.hasMany(Pemeriksaan, { foreignKey: 'pasien_id' });
Pemeriksaan.belongsTo(Pasien, { foreignKey: 'pasien_id' });

// Seeder function untuk membuat 5 user default
const seedUsers = async () => {
  const kaderRoles = ['meja1', 'meja2', 'meja3', 'meja4', 'meja5'];
  for (let role of kaderRoles) {
    const existing = await User.findOne({ where: { role } });
    if (!existing) {
      const hash = await bcrypt.hash('password123', 10); // default password
      await User.create({
        username: role,
        password: hash,
        role
      });
      console.log(`✅ Created default user: ${role} (username: ${role}, password: password123)`);
    }
  }
};

// Sync database dan lakukan seeding saat pertama kali dijalankan
sequelize.sync().then(() => {
  console.log('✅ Database synced');
  seedUsers();
});

module.exports = {
  sequelize,
  User,
  Pasien,
  Checkup,
  Pemeriksaan
};
