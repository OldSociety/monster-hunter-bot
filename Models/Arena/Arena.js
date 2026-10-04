// Models/ArenaAccounts.js
module.exports = (sequelize, DataTypes) => {
  const Arena = sequelize.define(
    'ArenaAccounts',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'user_id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      arenaScore: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      max_hp: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
      },
      current_hp: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      strength: {
        type: DataTypes.INTEGER,
        defaultValue: 4,
      },
      effective_strength: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      defense: {
        type: DataTypes.INTEGER,
        defaultValue: 4,
      },
      effective_defense: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      intelligence: {
        type: DataTypes.INTEGER,
        defaultValue: 4,
      },
      effective_intelligence: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      agility: {
        type: DataTypes.INTEGER,
        defaultValue: 4,
      },
      effective_agility: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      statPoints: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
      },
      equippedCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      timestamps: false,
    }
  )

  return Arena
}
