'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('collections', 'rarity', {
      type: Sequelize.STRING,
      defaultValue: 'Common', // Default value for existing records
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('collections', 'rarity');
  },
};
