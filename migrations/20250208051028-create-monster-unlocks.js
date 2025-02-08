'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('monster_item_unlocks', 'MonsterItemUnlocks')
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('Collections', 'evolved')
  },
}
