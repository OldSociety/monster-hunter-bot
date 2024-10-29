module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('Users', {
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
    },
    user_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    wealth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
    },
    org_name: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Lamplighters'
      },
    org_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    lead_investigator: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    specialty: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'relic',
    },
    library_size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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

  return User
}
