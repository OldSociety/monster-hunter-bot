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
      brute_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      caster_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      sneak_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      top_monsters: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      top_brutes: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      top_casters: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      top_sneaks: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      last_chat_message: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      last_daily_claim: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      daily_streak: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      last_free_claim: {
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
