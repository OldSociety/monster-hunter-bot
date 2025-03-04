'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'lastWildHuntAvailable', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
      comment: 'Timestamp for when Wild Hunt becomes available (after 24-hour cooldown).'
    });
    await queryInterface.addColumn('Users', 'wildHuntBuyInsUsed', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Daily count of Wild Hunt buy-ins used (max 4 buy-ins allowed).'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'lastWildHuntAvailable');
    await queryInterface.removeColumn('Users', 'wildHuntBuyInsUsed');
  }
};
