'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('RaidBoss', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      index: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      cr: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      hp: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      current_hp: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      boss_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      combatType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      rarity: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      imageUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      color: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      loot1: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      loot2: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      loot3: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      difficulty_stage: {
        type: Sequelize.INTEGER,
        defaultValue: 1, // 1‑Normal, 2‑Hard, 3‑Nightmare
      },
      threshold_state: {
        type: Sequelize.INTEGER,   // 0 = none, 1 = 25 %, 2 = 50 %, 3 = 75 %
        defaultValue: 0,
      },
      active: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      participants: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('RaidBoss')
  },
}
