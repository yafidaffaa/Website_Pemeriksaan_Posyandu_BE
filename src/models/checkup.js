module.exports = (sequelize, DataTypes) => {
  const Checkup = sequelize.define('Checkup', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    pasien_id: { type: DataTypes.INTEGER, allowNull: false },
    tanggal: { type: DataTypes.DATEONLY, allowNull: false },
    meja: { type: DataTypes.ENUM('meja1','meja2','meja3','meja4','meja5'), allowNull: false },
    data_input: { type: DataTypes.JSON, allowNull: true }, // fleksibel utk tiap meja
  }, {
    tableName: 'checkups',
    timestamps: true,
  });

  return Checkup;
};
