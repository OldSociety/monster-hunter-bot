const { DataTypes } = require('sequelize')
const sequelize = require('../config/sequelize')

// Import models
const User = require('./User/User')(sequelize, DataTypes)
const Collection = require('./Collection/Collection')(sequelize, DataTypes)

// Define associations
User.hasMany(Collection, {
  foreignKey: 'userId',
  as: 'Collections',
})

Collection.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
})

module.exports = {
  User,
  Collection,
}
