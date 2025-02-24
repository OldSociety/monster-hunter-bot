const fs = require('fs')
const path = require('path')
const { Op } = require('sequelize')

// Import your Monsters model
const { Monster } = require('../Models/model.js')

const {
  classifyMonsterType,
} = require('../commands/Hunt/huntUtils/huntHelpers.js')
const { allowedMonstersByPack } = require('../utils/shopMonsters')
const { calculateMScore } = require('../handlers/userMonsterHandler.js')
const { updateOrAddMonsterToCollection } = require('./userMonsterHandler')

// We'll still use the assets folder to determine valid creature filenames.
const assetsPath = path.join(__dirname, '..', 'assets')
const creatureFiles = fs.readdirSync(assetsPath)
const validCreatures = new Set(
  creatureFiles.map((filename) => path.parse(filename).name)
)

const excludedTypes = new Set([
  // Add any types to exclude (e.g., 'swarm')
])

// We'll build two caches: a flat cache and a tiered cache.
let cachePopulated = false
global.monsterCacheByTier = {
  Common: [],
  Uncommon: [],
  Rare: [],
  'Very Rare': [],
  Legendary: [],
}
global.monsterCache = []

const defaultTiers = [
  { name: 'Common', crRange: [0, 4], color: 0x808080, chance: 0.5 },
  { name: 'Uncommon', crRange: [5, 10], color: 0x00ff00, chance: 0.31 },
  { name: 'Rare', crRange: [11, 15], color: 0x0000ff, chance: 0.17 },
  { name: 'Very Rare', crRange: [16, 19], color: 0x800080, chance: 0.02 },
  { name: 'Legendary', crRange: [20, Infinity], color: 0xffd700, chance: 0 },
]

function getRarityByCR(cr) {
  if (cr >= 20) return 'Legendary'
  if (cr >= 16) return 'Very Rare'
  if (cr >= 11) return 'Rare'
  if (cr >= 5) return 'Uncommon'
  return 'Common'
}

/**
 * Populate the monster cache by querying the local Monsters model.
 */
async function populateMonsterCache() {
  if (cachePopulated) {
    console.log('[CACHE] Already populated, skipping.')
    return
  }

  console.log('[CACHE] Querying Monsters model for all monsters...')

  try {
    // Query all monsters from the database
    const monsters = await Monster.findAll()
    let addedCount = 0

    // Reset caches
    global.monsterCacheByTier = {
      Common: [],
      Uncommon: [],
      Rare: [],
      'Very Rare': [],
      Legendary: [],
    }
    global.monsterCache = []

    for (const monster of monsters) {
      // Ensure this monster's index is valid (i.e. the file exists in assets)
      if (!validCreatures.has(monster.index)) continue

      // Use the fields directly from the Monsters model.
      // Optionally, convert cr if needed.
      const cr = monster.cr

      // Determine rarity from CR if not provided.
      const rarity = monster.rarity || getRarityByCR(cr)
      const color =
        defaultTiers.find((tier) => tier.name === rarity)?.color || 0x808080
      const combatType = classifyMonsterType(monster.type)
      // You already have imageUrl in the model.
      const imageUrl = monster.imageUrl

      // Build a simplified monster object.
      const monsterData = {
        name: monster.name,
        index: monster.index,
        cr,
        type: monster.type,
        hp: monster.hp,
        combatType,
        rarity,
        imageUrl,
        color,
      }

      // Push into caches.
      global.monsterCacheByTier[rarity].push(monsterData)
      global.monsterCache.push(monsterData)
      addedCount++
    }

    console.log(`[CACHE] Successfully stored ${addedCount} monsters from DB.`)
    cachePopulated = true
  } catch (error) {
    console.error('[CACHE] Failed to populate monster cache:', error)
  }
}

function pullMonsterByCR(cr) {
  const availableMonsters = global.monsterCache.filter(
    (monster) => monster.cr === cr
  )

  if (availableMonsters.length === 0) {
    console.log(`No monsters available for CR ${cr}.`)
    return null
  }

  return availableMonsters[Math.floor(Math.random() * availableMonsters.length)]
}

function pullSpecificMonster(index) {
  console.log(`[PULL] Searching for: ${index}`)

  if (!global.monsterCache || global.monsterCache.length === 0) {
    console.error(
      '[PULL ERROR] monsterCache is empty! Ensure populateMonsterCache() ran.'
    )
    return null
  }

  console.log(`[PULL] Total monsters in cache: ${global.monsterCache.length}`)

  const foundMonster = global.monsterCache.find(
    (monster) => monster.index === index
  )

  if (!foundMonster) {
    console.warn(`[PULL] Monster ${index} not found in cache!`)
    console.log(
      '🔍 Available indexes:',
      global.monsterCache.slice(0, 5).map((m) => m.index)
    )
    return null
  }

  console.log(`[PULL] Found ${index} in monsterCache!`, foundMonster)

  const mScore = calculateMScore(foundMonster.cr, foundMonster.rarity, 1)
  return { ...foundMonster, mScore }
}

async function pullValidMonster(
  tierOption,
  packType,
  userId,
  maxAttempts = 10
) {
  let attempts = 0;
  let monster;

  const allowedMonstersSet = allowedMonstersByPack[packType];
  if (!allowedMonstersSet || allowedMonstersSet.size === 0) {
    console.warn(`[PULL ERROR] No allowed monsters defined for pack: ${packType}`);
    return null;
  }

  do {
    const tierName =
      packType === 'elemental' && tierOption.customTiers
        ? selectTier(tierOption.customTiers)
        : tierOption.name;

    const eligibleMonsters = global.monsterCacheByTier?.[tierName] || [];

    console.log(`[PULL] Checking ${tierName} tier - ${eligibleMonsters.length} available`);

    const filteredMonsters = eligibleMonsters.filter((monster) =>
      allowedMonstersSet.has(monster.index)
    );

    console.log(`[PULL] Allowed monsters after filtering: ${filteredMonsters.length}`);

    if (!filteredMonsters.length) {
      console.warn(`[PULL ERROR] No eligible monsters in tier: ${tierName} after filtering`);
      return null;
    }

    // Calculate total weight using 1 / (CR + 1)
    const totalWeight = filteredMonsters.reduce((sum, m) => sum + (1 / (m.cr + 1)), 0);
    let randomWeight = Math.random() * totalWeight;
    for (const m of filteredMonsters) {
      randomWeight -= (1 / (m.cr + 1));
      if (randomWeight <= 0) {
        monster = m;
        break;
      }
    }

    attempts++;
  } while (!monster && attempts < maxAttempts);

  if (monster) {
    console.log(`[PULL] Successfully pulled ${monster.name}. Adding to collection.`);
    await updateOrAddMonsterToCollection(userId, monster);
  }

  return monster;
}

async function fetchMonsterByName(name) {
  if (!cachePopulated) {
    console.log('[FETCH] Cache not populated. Populating cache now...')
    await populateMonsterCache()
  }

  // Search in the flat cache (global.monsterCache).
  const foundMonster = global.monsterCache.find(
    (m) => m.name.toLowerCase() === name.toLowerCase()
  )

  if (!foundMonster) {
    console.warn(`[FETCH] Monster ${name} not found in cache.`)
    return null
  }

  return foundMonster
}

function selectTier(customTiers) {
  const roll = Math.random()
  let cumulative = 0
  for (const tier of customTiers) {
    cumulative += tier.chance
    if (roll < cumulative) return tier.name
  }
  return customTiers[0].name
}

module.exports = {
  populateMonsterCache,
  pullMonsterByCR,
  pullSpecificMonster,
  pullValidMonster,
  fetchMonsterByName,
  selectTier,
}
