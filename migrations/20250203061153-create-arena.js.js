'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ArenaAccounts', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Users', // Make sure your Users table is named "Users"
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      hp: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
      },
      strength: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
      },
      defense: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
      },
      agility: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
      },
      statPoints: {
        type: Sequelize.INTEGER,
        defaultValue: 10,
      },
      equippedCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ArenaAccounts')
  },
}
