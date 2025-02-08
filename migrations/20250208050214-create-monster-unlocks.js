'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('MonsterItemUnlocks', {
      monsterIndex: {
        type: Sequelize.STRING,
        allowNull: false,
        references: { model: 'monsters', key: 'index' }, // Reference Monsters by 'index'
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      baseItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'BaseItems', key: 'id' }, // Reference BaseItems by 'id'
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    }, {
      timestamps: false, // Ensure timestamps are disabled
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('MonsterItemUnlocks')
  },
}
