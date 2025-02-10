module.exports = (sequelize, DataTypes) => {
  const MonsterStats = sequelize.define(
    'MonsterStats',
    {
      pageHunt: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      monster_index: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      monster_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      wins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      losses: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      timestamps: false,
    }
  )

  return MonsterStats
}
