module.exports = (sequelize, DataTypes) => {
  const Pasien = sequelize.define('Pasien', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nama: { type: DataTypes.STRING, allowNull: false },
    tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: false },
    jenis_kelamin: { type: DataTypes.ENUM('L','P'), allowNull: false },
    kategori: { type: DataTypes.ENUM('balita','ibu_hamil'), allowNull: false },
    alamat: { type: DataTypes.STRING },
    no_telp: { type: DataTypes.STRING },
  }, {
    tableName: 'pasiens',
    timestamps: true,
  });

  return Pasien;
};
