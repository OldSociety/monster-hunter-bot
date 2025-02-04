'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Arenas', 'intelligence');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('ArenaAccounts', 'Arenas');
  }
};
