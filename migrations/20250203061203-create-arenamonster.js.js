'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ArenaMonsters', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      hp: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      strength: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      defense: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      agility: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      resistance: {
        type: Sequelize.JSON,
        defaultValue: {},
      },
      attacks: {
        type: Sequelize.JSON,
        defaultValue: [],
      },
      flavorText: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      loot: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      droprate: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ArenaMonsters')
  },
}
