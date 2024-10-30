'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Collections', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      cr: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      m_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      level: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      copies: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      copies_needed: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
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
    await queryInterface.dropTable('Collections')
  },
}
