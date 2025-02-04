module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ArenaAccounts', 'effective_strength', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    }),
    await queryInterface.addColumn('ArenaAccounts', 'effective_defense', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    }),
    await queryInterface.addColumn('ArenaAccounts', 'effective_intelligence', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    }),
    await queryInterface.addColumn('ArenaAccounts', 'effective_agility', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('ArenaAccounts', 'Arenas')
  },
}
