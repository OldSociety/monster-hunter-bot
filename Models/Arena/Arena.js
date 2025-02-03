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
        },
        hp: {
          type: DataTypes.INTEGER,
          defaultValue: 5,
        },
        strength: {
          type: DataTypes.INTEGER,
          defaultValue: 5,
        },
        defense: {
          type: DataTypes.INTEGER,
          defaultValue: 5,
        },
        agility: {
          type: DataTypes.INTEGER,
          defaultValue: 5,
        },
        statPoints: {
          type: DataTypes.INTEGER,
          defaultValue: 10,
        },
        equippedCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        }
      },
      {
        timestamps: false,
      }
    )
  
    return Arena
  }
  