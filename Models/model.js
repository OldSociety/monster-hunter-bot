const { DataTypes } = require('sequelize')
const sequelize = require('../config/sequelize')

// =========================
// Load Hunt Models
// =========================
const User = require('./User/User')(sequelize, DataTypes)
const Collection = require('./Collection/Collection')(sequelize, DataTypes)
const Monster = require('./MonsterList/Monster')(sequelize, DataTypes) 
const MonsterStats = require('./MonsterList/MonsterStats')(sequelize, DataTypes) 
const MonsterItemUnlocks = require('./MonsterList/MonsterItemUnlocks')(sequelize, DataTypes)

// =========================
// Load Arena Models
// =========================
const Arena = require('./Arena/Arena')(sequelize, DataTypes)
const ArenaMonster = require('./Arena/ArenaMonster')(sequelize, DataTypes)
const BaseItem = require('./Arena/BaseItem')(sequelize, DataTypes)
const Inventory = require('./Arena/Inventory')(sequelize, DataTypes)
const PlayerProgressStat = require('./Arena/PlayerProgressStat')(sequelize, DataTypes)

// =========================
// User Associations
// =========================
// User → Collection (One-to-Many)
User.hasMany(Collection, {
  foreignKey: 'userId',
  as: 'collections',
})
Collection.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
})

// User → Arena Profile (One-to-One)
User.hasOne(Arena, {
  foreignKey: 'userId',
  as: 'arenaProfile',
})
Arena.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
})

// =========================
// Arena Inventory Associations
// =========================
// Arena → Inventory (One-to-Many)
Arena.hasMany(Inventory, {
  foreignKey: 'ArenaId',
  as: 'inventoryList',
})
Inventory.belongsTo(Arena, {
  foreignKey: 'ArenaId',
  as: 'owner',
})

// BaseItem → Inventory (One-to-Many)
BaseItem.hasMany(Inventory, {
  foreignKey: 'itemId',
  as: 'itemInventories',
})
Inventory.belongsTo(BaseItem, {
  foreignKey: 'itemId',
  as: 'item',
})

// =========================
// Monster Item Unlocks (Forge System)
// =========================
// Base Monster → BaseItem (Many-to-Many via MonsterItemUnlocks)
// This connects the *base* Monster list to the items they unlock in the forge.
Monster.belongsToMany(BaseItem, {
  through: MonsterItemUnlocks,
  foreignKey: 'monsterIndex', // Links to the Monster's `index`
  as: 'unlockableItems',
})
BaseItem.belongsToMany(Monster, {
  through: MonsterItemUnlocks,
  foreignKey: 'baseItemId', // Links to the item's `id`
  as: 'unlockedByMonsters',
})

// MonsterItemUnlocks → BaseItem (One-to-One)
// Direct connection for fetching the forgeable item
MonsterItemUnlocks.belongsTo(BaseItem, {
  foreignKey: 'baseItemId',
  as: 'forgedItem',
})

// MonsterItemUnlocks → Monster (One-to-One)
// Links unlocks directly to a base monster
MonsterItemUnlocks.belongsTo(Monster, {
  foreignKey: 'monsterIndex',
  targetKey: 'index', // Ensures it links correctly to the Monster index
  as: 'unlockingMonster',
})

// =========================
// Arena Battle Progress Tracking
// =========================
// Arena → PlayerProgressStat (One-to-Many)
Arena.hasMany(PlayerProgressStat, {
  foreignKey: 'playerId',
  as: 'progressStats',
})
PlayerProgressStat.belongsTo(Arena, {
  foreignKey: 'playerId',
  as: 'player',
})

// ArenaMonster → PlayerProgressStat (One-to-Many)
ArenaMonster.hasMany(PlayerProgressStat, {
  foreignKey: 'monsterId',
  as: 'playerStats',
})
PlayerProgressStat.belongsTo(ArenaMonster, {
  foreignKey: 'monsterId',
  as: 'monster',
})

// =========================
// Export Models
// =========================
module.exports = {
  User,
  Collection,
  Monster,
  MonsterStats,
  MonsterItemUnlocks,
  Arena,
  ArenaMonster,
  BaseItem,
  Inventory,
  PlayerProgressStat,
}
