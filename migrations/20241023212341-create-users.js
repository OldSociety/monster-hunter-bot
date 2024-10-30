module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define('Users', {
    user_id: {
      type: Sequelize.STRING,
      allowNull: false,
      primaryKey: true,
    },
    user_name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    gold: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    dice: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    gems: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    eggs: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    ichor: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    class: {
        type: Sequelize.ENUM('fighter', 'wizard', 'rogue'),
        allowNull: false,
        defaultValue: 'fighter'
      },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  })

  return User
}
