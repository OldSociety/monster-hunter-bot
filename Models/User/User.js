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
      defaultValue: 1000,
    },
    currency: {
      type: DataTypes.JSON,
      defaultValue: {
        gems: 0,
        eggs: 0,
        ichor: 0,
        dice: 0,
      },
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    class_score: {
      type: DataTypes.JSON,
      defaultValue: {
        brute: 0,
        caster: 0,
        sneak: 0,
      },
    },
    top_monsters: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    last_chat_message: {
      type: DataTypes.DATE,
      allowNull: true,
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
