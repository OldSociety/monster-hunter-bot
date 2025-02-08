const { DataTypes } = require('sequelize')
const sequelize = require('../config/sequelize')

// Hunt models
const User = require('./User/User')(sequelize, DataTypes)
const Collection = require('./Collection/Collection')(sequelize, DataTypes)
const Monster = require('./MonsterList/Monster')(sequelize, DataTypes)

// Arena models
// const Arena = require('./Arena/Arenas')(sequelize, DataTypes)
// const ArenaMonster = require('./Arena/ArenaMonster')(sequelize, DataTypes)
// const BaseItem = require('./Arena/BaseItems')(sequelize, DataTypes)
// const Inventory = require('./Arena/Inventories')(sequelize, DataTypes)
// const PlayerProgressStat = require('./Arena/PlayerProgressStats')(
//   sequelize,
//   DataTypes
// )

// Hunt
User.hasMany(Collection, {
  foreignKey: 'userId',
  as: 'Collections',
})

Collection.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
})

// // Arena
// User.hasOne(Arena, {
//   foreignKey: 'userId',
//   as: 'arenaProfile',
// })
// Arena.belongsTo(User, {
//   foreignKey: 'userId',
//   as: 'user',
// })

// // Arena → Inventory (one-to-many)
// Arena.hasMany(Inventory, {
//   foreignKey: 'ArenaId',
//   as: 'inventoryList',
// })
// Inventory.belongsTo(Arena, {
//   foreignKey: 'ArenaId',
//   as: 'owner',
// })

// // BaseItem → Inventory (one-to-many)
// BaseItem.hasMany(Inventory, {
//   foreignKey: 'itemId',
//   as: 'itemInventories',
// })
// Inventory.belongsTo(BaseItem, {
//   foreignKey: 'itemId',
//   as: 'item',
// })

// // (Optional) Set up associations for player progress stats.
// // Assuming that playerId in PlayerProgressStat refers to the Arena id and monsterId to ArenaMonster id.
// Arena.hasMany(PlayerProgressStat, {
//   foreignKey: 'playerId',
//   as: 'progressStats',
// })
// PlayerProgressStat.belongsTo(Arena, {
//   foreignKey: 'playerId',
//   as: 'player',
// })

// ArenaMonster.hasMany(PlayerProgressStat, {
//   foreignKey: 'monsterId',
//   as: 'playerStats',
// })
// PlayerProgressStat.belongsTo(ArenaMonster, {
//   foreignKey: 'monsterId',
//   as: 'monster',
// })

module.exports = {
  User,
  Collection,
  Monster
  // Arena,
  // ArenaMonster,
  // BaseItem,
  // Inventory,
  // PlayerProgressStat,
}
