'use strict';

module.exports = {
  /**  Adds difficulty_stage & threshold_state to the RaidBoss table. */
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('RaidBoss', 'difficulty_stage', {
      type: Sequelize.INTEGER,
      defaultValue: 1,      // 1 = Normal, 2 = Hard, 3 = Nightmare
    });

    await queryInterface.addColumn('RaidBoss', 'threshold_state', {
      type: Sequelize.INTEGER,
      defaultValue: 0,      // 0 none, 1 25 %, 2 50 %, 3 75 %
    });
  },

  /**  Rolls back both columns. */
  down: async (queryInterface /*, Sequelize */) => {
    await queryInterface.removeColumn('RaidBoss', 'threshold_state');
    await queryInterface.removeColumn('RaidBoss', 'difficulty_stage');
  },
};
