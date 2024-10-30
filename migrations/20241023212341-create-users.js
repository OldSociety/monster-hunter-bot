'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
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
        defaultValue: 1000,
      },
      currency: {
        type: Sequelize.JSON,
        defaultValue: {
          gems: 0,
          eggs: 0,
          ichor: 0,
          dice: 0,
        },
      },
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      class: {
        type: Sequelize.ENUM('fighter', 'wizard', 'rogue'),
        allowNull: true,
      },
      top_monsters: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
      
      last_chat_message: {
        type: Sequelize.DATE,
        allowNull: true,
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Users')
  },
}
