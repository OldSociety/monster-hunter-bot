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
    cr: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    experience: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    copies: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    exp_needed: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
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
