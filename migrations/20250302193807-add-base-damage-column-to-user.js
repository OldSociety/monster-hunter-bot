'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'base_damage', {
      type: Sequelize.INTEGER,
      defaultValue: 0, // Default value for existing records
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Users', 'base_damage')
  },
}
