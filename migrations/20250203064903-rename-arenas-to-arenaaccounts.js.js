'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('Arenas', 'ArenaAccounts');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('ArenaAccounts', 'Arenas');
  }
};
