module.exports = (sequelize, DataTypes) => {
  const Investigator = sequelize.define('Investigators', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prowess: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    knowledge: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    specialty: {
      type: DataTypes.ENUM(
        'relic',
        'cult',
        'mythos'
      ),
      allowNull: false,
    },
    experience: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    resolve: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      allowNull: false,
    },
    sanity: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
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

  return Investigator
}
