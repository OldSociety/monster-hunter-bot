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
        defaultValue: 500,
      },
      currency: {
        type: Sequelize.JSON,
        defaultValue: {
          energy: 10,
          tokens: 0,
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
      spellsword_score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      stealth_score: {
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
      top_spellswords: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      top_stealths: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      base_damage: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      completedLevels: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      current_raidHp: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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
