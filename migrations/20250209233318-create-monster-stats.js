'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'MonsterStats',
      {
        pageHunt: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        monster_index: {
          type: Sequelize.STRING,
          primaryKey: true,
        },
        monster_name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        wins: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        losses: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
      },
      {
        timestamps: false,
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('MonsterStats')
  },
}
