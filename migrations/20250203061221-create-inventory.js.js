'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Inventories', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      ArenaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Arenas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      itemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'BaseItems',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      equipped: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Inventories')
  },
}
