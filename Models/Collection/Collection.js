module.exports = (sequelize, DataTypes) => {
  const Collection = sequelize.define('Collections', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rarity: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Common',
    },
    cr: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    hp: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    m_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    rank: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    copies: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Users', // Refers to the Users table
        key: 'user_id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  })

  return Collection
}
