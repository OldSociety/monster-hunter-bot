const { DataTypes } = require('sequelize')
const sequelize = require('../config/sequelize')

// Import models
const User = require('./User/User')(sequelize, DataTypes)
const Collection = require('./Collection/Collection')(sequelize, DataTypes)

// Set up associations
User.associate = (models) => {
  User.hasMany(models.Collection, {
    foreignKey: 'userId',
    as: 'Collections',
  })
}

Collection.associate = (models) => {
  Collection.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user',
  })
}

// Call the associations
User.associate({ Collection })
Collection.associate({ User })



module.exports = {
  User,
  Collection,
}
