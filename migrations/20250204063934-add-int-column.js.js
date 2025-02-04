'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ArenaAccounts', 'intelligence', {
      type: Sequelize.INTEGER,
      defaultValue: 4,
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('ArenaAccounts', 'Arenas')
  },
}
