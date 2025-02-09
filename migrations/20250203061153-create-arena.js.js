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
      arenaScore: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      max_hp: {
        type: Sequelize.INTEGER,
        defaultValue: 5,
      },
      current_hp: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      strength: {
        type: Sequelize.INTEGER,
        defaultValue: 4,
      },
      effective_strength: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      defense: {
        type: Sequelize.INTEGER,
        defaultValue: 4,
      },
      effective_defense: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      intelligence: {
        type: Sequelize.INTEGER,
        defaultValue: 4,
      },
      effective_intelligence: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      agility: {
        type: Sequelize.INTEGER,
        defaultValue: 4,
      },
      effective_agility: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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
