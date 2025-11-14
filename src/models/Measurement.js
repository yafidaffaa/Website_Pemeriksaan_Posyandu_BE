// models/Measurement.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const zscore = require('../utils/zscore'); // helper untuk perhitungan Z-score

const Measurement = sequelize.define(
  'Measurement',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    // Relasi
    checkupSessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'checkup_session_id',
    },
    createdById: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'created_by_id',
    },
    updatedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'updated_by_id',
    },

    // =================== GENERAL ===================
    counselingNotes: { type: DataTypes.TEXT, allowNull: true, field: 'counseling_notes' },
    stuntingStatus: { type: DataTypes.STRING(100), allowNull: true, field: 'stunting_status' },

    // =================== BALITA ===================
    ageMonths: { type: DataTypes.INTEGER, allowNull: true, field: 'age_months' },
    weightKg: { type: DataTypes.FLOAT, allowNull: true, field: 'weight_kg' },
    heightCm: { type: DataTypes.FLOAT, allowNull: true, field: 'height_cm' },
    headCircCm: { type: DataTypes.FLOAT, allowNull: true, field: 'head_circ_cm' },
    lilaCm: { type: DataTypes.FLOAT, allowNull: true, field: 'lila_cm' },
    asi: { type: DataTypes.STRING(50), allowNull: true },
    vitaminA: {
      type: DataTypes.ENUM('merah', 'biru', 'tidak'),
      allowNull: true,
      field: 'vitamin_a',
    },
    statusGizi: { type: DataTypes.STRING(100), allowNull: true, field: 'status_gizi' },
    zScoreBMIU: { type: DataTypes.FLOAT, allowNull: true, field: 'zscore_bmi_u' },

    // =================== IBU HAMIL ===================
    ageMonthsPregnant: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'age_months_pregnant',
    },
    weightKgPregnant: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'weight_kg_pregnant',
    },
    heightCmPregnant: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'height_cm_pregnant',
    },
    lilaCmPregnant: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'lila_cm_pregnant',
    },
    zScoreBMIPregnant: {
      type: DataTypes.FLOAT,
      allowNull: true,
      field: 'zscore_bmi_pregnant',
    },

    tekananDarah: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'tekanan_darah',
      validate: {
        is: /^[0-9/]+$/i, // hanya angka dan tanda "/"
      },
    },

    // =================== LAB & EXAMS ===================
    proteinUrine: {
      type: DataTypes.ENUM('positif', 'negatif'),
      allowNull: true,
      field: 'protein_urine',
    },
    reduksiUrine: {
      type: DataTypes.ENUM('positif', 'negatif'),
      allowNull: true,
      field: 'reduksi_urine',
    },
    testHiv: {
      type: DataTypes.ENUM('positif', 'negatif'),
      allowNull: true,
      field: 'test_hiv',
    },
    testSifilis: {
      type: DataTypes.ENUM('positif', 'negatif'),
      allowNull: true,
      field: 'test_sifilis',
    },
    testHbsAg: {
      type: DataTypes.ENUM('positif', 'negatif'),
      allowNull: true,
      field: 'test_hbsag',
    },
    gds: { type: DataTypes.FLOAT, allowNull: true },
    ancTerpadu: {
      type: DataTypes.ENUM('sudah', 'belum'),
      allowNull: true,
      field: 'anc_terpadu',
    },
    HB: { type: DataTypes.FLOAT, allowNull: true, field: 'hb' },
    resiko: {
      type: DataTypes.ENUM('kecil', 'sedang', 'tinggi'),
      allowNull: true,
      field: 'resiko',
    },
  },
  {
    tableName: 'measurements',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

module.exports = { Measurement };
