module.exports = (sequelize, DataTypes) => {
    const MonsterItemUnlocks = sequelize.define(
      'MonsterItemUnlocks',
      {
        monsterIndex: {
          type: DataTypes.STRING,
          allowNull: false,
          references: { model: 'monsters', key: 'index' }, // Reference Monsters (by index)
        },
        baseItemId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'BaseItems', key: 'id' }, // Reference BaseItems
        },
      },
      {
        timestamps: false,
        tableName: 'monster_item_unlocks',
      }
    )
  
    return MonsterItemUnlocks
  }
  