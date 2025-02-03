'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PlayerProgressStats', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      playerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      monsterId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      victories: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      unlocked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      lootUnlocked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PlayerProgressStats')
  },
}
