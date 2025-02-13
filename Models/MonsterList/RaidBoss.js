module.exports = (sequelize, DataTypes) => {
  const RaidBoss = sequelize.define(
    'RaidBoss',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      index: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      cr: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hp: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      current_hp: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      boss_score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      combatType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      rarity: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      color: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      loot1: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      loot2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      loot3: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      timestamps: false,
      tableName: 'RaidBoss',
    }
  )
  return RaidBoss
}
