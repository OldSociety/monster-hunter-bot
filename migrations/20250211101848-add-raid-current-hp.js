'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'current_raidHp', {
      type: Sequelize.INTEGER,
      defaultValue: 0, // Default value for existing records
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('collections', 'current_raidHp')
  },
}
