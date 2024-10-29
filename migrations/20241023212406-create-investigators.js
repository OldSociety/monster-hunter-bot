'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Investigators', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      prowess: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      knowledge: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      specialty: {
        type: Sequelize.ENUM(
          'relic',
          'cult',
          'mythos'
        ),
        allowNull: false,
      },
      experience: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },
      resolve: {
        type: Sequelize.INTEGER,
        defaultValue: 100,
        allowNull: false,
      },
      sanity: {
        type: Sequelize.INTEGER,
        defaultValue: 100,
        allowNull: false,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Users', // Refers to the Users table
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Investigators')
  },
}
