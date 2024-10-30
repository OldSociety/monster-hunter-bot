module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('Users', {
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    user_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    dice: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    gems: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    eggs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    ichor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    class: {
        type: DataTypes.ENUM('fighter', 'wizard', 'rogue'),
        allowNull: false,
        defaultValue: 'fighter'
      },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  })

  return User
}
