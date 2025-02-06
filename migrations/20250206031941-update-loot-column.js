module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('ArenaMonsters', 'loot', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('ArenaMonsters', 'loot', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
