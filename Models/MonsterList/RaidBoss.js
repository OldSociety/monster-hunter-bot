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
      },
      {
        timestamps: false,
        tableName: 'RaidBoss',
      }
    )
    return RaidBoss
  }
  