const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const routes = require('./routes');

const app = express();

// 🌐 CORS Configuration
const allowedOrigins = [
  `http://${process.env.IP_FE}`,
  `http://${process.env.HOST}:3000`,
  'http://localhost:3000',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      `http://${process.env.IP_FE}`,
      `http://${process.env.HOST}:3000`,
      'http://localhost:3000',
      'http://localhost:5173',
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ✅ Routes utama
app.use('/api', routes);

// ✅ Handler untuk 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ✅ Error handler global
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;
