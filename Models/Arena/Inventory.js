module.exports = (sequelize, DataTypes) => {
  const Inventory = sequelize.define(
    'Inventories',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      ArenaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Arenas',
          key: 'id',
        },
      },
      itemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'BaseItems',
          key: 'id',
        },
      },
      equipped: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1, // Default to 1 when a new item is added
      },
    },
    {
      timestamps: false,
    }
  )

  return Inventory
}
