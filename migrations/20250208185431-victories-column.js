module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('PlayerProgressStats', 'victories', 'victories_easy');
    await queryInterface.addColumn('PlayerProgressStats', 'victories_medium', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
    await queryInterface.addColumn('PlayerProgressStats', 'victories_hard', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('ArenaAccounts', 'Arenas')
  },
}
