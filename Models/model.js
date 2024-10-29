const { DataTypes } = require('sequelize')
const sequelize = require('../config/sequelize')

// Import models
const User = require('./User/User')(sequelize, DataTypes)
const Investigator = require('./Investigator/Investigator')(sequelize, DataTypes)

// Set up associations
User.associate = (models) => {
  User.hasMany(models.Investigator, {
    foreignKey: 'userId',
    as: 'investigators',
  })
}

Investigator.associate = (models) => {
  Investigator.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  })
}

// Call the associations
User.associate({ Investigator })
Investigator.associate({ User })



module.exports = {
  User,
  Investigator,
}
