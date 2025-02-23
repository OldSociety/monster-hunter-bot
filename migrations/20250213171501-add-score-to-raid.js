'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('RaidBoss', 'boss_score', {
      type: Sequelize.INTEGER,
      defaultValue: 0, // Default value for existing records
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('RaidBoss', 'boss_score')
  },
}
