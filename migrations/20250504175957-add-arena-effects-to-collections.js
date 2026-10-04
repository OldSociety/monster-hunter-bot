'use strict'
const { Op } = require('sequelize')
const { classifyMonsterType } = require('../commands/Hunt/huntUtils/huntHelpers') // adjust path

module.exports = {
  async up (queryInterface, DataTypes) {
    /* 1 ── new column */
    await queryInterface.addColumn('Monsters', 'arenaEffect', {
      type: DataTypes.JSON,     // stored as TEXT in SQLite
      allowNull: true,
    })

  },

  async down (queryInterface, _sequelize) {
    await queryInterface.removeColumn('Collections', 'arenaEffect')
  }
}
