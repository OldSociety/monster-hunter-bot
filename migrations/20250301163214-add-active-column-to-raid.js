module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('RaidBoss', 'active', {
      type: Sequelize.BOOLEAN,
      defaultValue: false, // Default value for existing records
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('RaidBoss', 'active')
  },
}
