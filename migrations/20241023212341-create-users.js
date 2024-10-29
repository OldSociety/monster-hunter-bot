'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
      },
      user_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      specialty: {
        type: Sequelize.ENUM('relic', 'cult', 'mythos'),
        allowNull: true,
        defaultValue: 'relic',
      },
      wealth: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100,
      },
      org_name: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'Lamplighters',
      },
      org_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      lead_investigator: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      library_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
    await queryInterface.dropTable('Users')
  },
}
