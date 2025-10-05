module.exports = (sequelize, DataTypes) => {
  const Pemeriksaan = sequelize.define('Pemeriksaan', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pasien_id: { type: DataTypes.INTEGER, allowNull: false },
    tanggal: { type: DataTypes.DATEONLY, allowNull: false },
    hasil_input: { type: DataTypes.JSON, allowNull: true },
    hasil_perhitungan: { type: DataTypes.JSON, allowNull: true }, // hasil kalkulasi otomatis
  }, {
    tableName: 'pemeriksaans',
    timestamps: true,
  });

  return Pemeriksaan;
};
