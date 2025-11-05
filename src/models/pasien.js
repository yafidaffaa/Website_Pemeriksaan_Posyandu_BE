const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Pasien = sequelize.define(
  "Pasien",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    patientType: {
      type: DataTypes.ENUM("balita", "ibu_hamil"),
      allowNull: false,
      field: "patient_type",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "birth_date",
    },
    gender: {
      type: DataTypes.ENUM("L", "P"),
      allowNull: false,
    },

    // ===================== KHUSUS BALITA =====================
    motherName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "mother_name",
    },
    rt: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    kb: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Metode KB yang digunakan oleh ibu balita",
    },
    pus: {
    type: DataTypes.STRING(50),
    allowNull: true,
    },
    wus: {
    type: DataTypes.STRING(50),
    allowNull: true,
    },
    imunisasi: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Jenis imunisasi atau status vaksinasi balita",
    },
    ageInWeeks: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "age_in_weeks",
      comment: "Usia dalam minggu untuk balita",
    },

    // ===================== KHUSUS IBU HAMIL =====================
    nik: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    noKK: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "no_kk",
    },
    namaSuami: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "nama_suami",
    },
    gravida: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    partus: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    abortus: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    jarakPersalinanSebelumnya: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "jarak_persalinan_sebelumnya",
    },
    usiaKandunganMinggu: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "usia_kandungan_minggu",
    },
    tglPemeriksaanPertama: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "tgl_pemeriksaan_pertama",
    },
    hpm: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    hpl: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    nomorJaminan: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "nomor_jaminan",
    },
    noTelp: {
      type: DataTypes.STRING(15),
      allowNull: true,
      field: "no_telp",
    },
    golonganDarah: {
      type: DataTypes.STRING(5),
      allowNull: true,
      field: "golongan_darah",
    },
    ageInYears: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "age_in_years",
      comment: "Usia dalam tahun untuk ibu hamil",
    },
  },
  {
    tableName: "pasiens",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Pasien;
