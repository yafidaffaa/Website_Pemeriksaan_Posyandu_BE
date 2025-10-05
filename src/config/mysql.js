const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD,  {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  logging: false, // nonaktifkan log query, opsional
  port: process.env.DB_PORT || 3308,
});

sequelize.authenticate()
  .then(() => console.log('✅ Sequelize connected to MySQL database'))
  .catch(err => console.error('❌ Unable to connect with Sequelize:', err));

module.exports = sequelize;
