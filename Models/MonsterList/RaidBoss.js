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
      difficulty_stage: {
        type: DataTypes.INTEGER,
        defaultValue: 1, // 1‑Normal, 2‑Hard, 3‑Nightmare
        allowNull: false,
      },
      threshold_state: {
        type: DataTypes.INTEGER,   // 0 = none, 1 = 25 %, 2 = 50 %, 3 = 75 %
        defaultValue: 0,
        allowNull: false,
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      participants: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      timestamps: false,
      tableName: 'RaidBoss',
    }
  )
  return RaidBoss
}
