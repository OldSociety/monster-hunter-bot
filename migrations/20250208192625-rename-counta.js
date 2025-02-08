module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('Inventories', 'count', 'quantity');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('ArenaAccounts', 'Arenas')
  },
}
