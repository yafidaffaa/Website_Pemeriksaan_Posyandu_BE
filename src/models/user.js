module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { 
      type: DataTypes.ENUM('meja1','meja2','meja3','meja4','meja5'),
      allowNull: false 
    },
  }, {
    tableName: 'users',
    timestamps: true,
  });

  return User;
};
