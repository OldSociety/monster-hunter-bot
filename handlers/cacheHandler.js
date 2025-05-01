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
    // console.log('[CACHE] Already populated, skipping.')
    return
  }

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
      if (!validCreatures.has(monster.index)) {
        console.log(
          `[CACHE] Skipping ${monster.name} (${monster.index}) – asset not found.`
        )
        continue
      }

      const cr = monster.cr
      const rarity = monster.rarity || getRarityByCR(cr)
      const color =
        defaultTiers.find((tier) => tier.name === rarity)?.color || 0x808080
      const combatType = classifyMonsterType(monster.type)
      const imageUrl = monster.imageUrl

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

    // console.log(`[CACHE] Successfully stored ${addedCount} monsters from DB.`)

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
  // console.log(`[PULL] Searching for: ${index}`)

  if (!global.monsterCache || global.monsterCache.length === 0) {
    console.error(
      '[PULL ERROR] monsterCache is empty! Ensure populateMonsterCache() ran.'
    )
    return null
  }

  // console.log(`[PULL] Total monsters in cache: ${global.monsterCache.length}`)

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

  // console.log(`[PULL] Found ${index} in monsterCache!`, foundMonster)

  const mScore = calculateMScore(foundMonster.cr, foundMonster.rarity, 1)
  return { ...foundMonster, mScore }
}

async function pullValidMonster(
  tierOption,
  packType,
  userId,
  maxAttempts = 10
) {
  let attempts = 0, monster;

  // 1) force allowedEntries into an array
  const allowedEntries = Array.from(allowedMonstersByPack[packType] || []);
  if (allowedEntries.length === 0) {
    console.warn(`[PULL ERROR] No allowed monsters defined for pack: ${packType}`);
    return null;
  }

  // 2) build map of explicit chances
  const explicitChance = new Map(
    allowedEntries
      .filter(e => e.chance != null)
      .map(e => [e.monster, e.chance])
  );

  do {
    const tierName =
      ['monstrosity','elemental','werefolk'].includes(packType) && tierOption.customTiers
        ? selectTier(tierOption.customTiers)
        : tierOption.name;

    const eligible = global.monsterCacheByTier?.[tierName] || [];
    const filteredMonsters = eligible.filter(m =>
      allowedEntries.some(e => e.monster === m.index)
    );
    if (!filteredMonsters.length) {
      console.warn(`[PULL ERROR] No eligible monsters in tier: ${tierName}`);
      return null;
    }

    // 3) attach explicit chances, clear others
    filteredMonsters.forEach(m => {
      if (explicitChance.has(m.index)) {
        m.chance = explicitChance.get(m.index);
      } else {
        delete m.chance;
      }
    });

    // 4) compute remaining pool and distribute
    const definedTotal = filteredMonsters
      .filter(m => m.chance != null)
      .reduce((sum, m) => sum + m.chance, 0);
    const undefinedCount = filteredMonsters.filter(m => m.chance == null).length;
    const perUndefined = undefinedCount
      ? (1 - definedTotal) / undefinedCount
      : 0;
    filteredMonsters.forEach(m => {
      if (m.chance == null) m.chance = perUndefined;
    });

    // 5) re-added debug logs
    console.log("[PULL] Monster chances before selection:");
    filteredMonsters.forEach(m => {
      console.log(`Monster: ${m.name}, Chance: ${m.chance}`);
    });

    // 6) select by weight = chance * (1/(cr+1))
    const totalWeight = filteredMonsters.reduce(
      (sum, m) => sum + m.chance * (1 / (m.cr + 1)),
      0
    );
    let roll = Math.random() * totalWeight;
    for (const m of filteredMonsters) {
      roll -= m.chance * (1 / (m.cr + 1));
      if (roll <= 0) { monster = m; break; }
    }

    attempts++;
  } while (!monster && attempts < maxAttempts);

  if (monster) {
    console.log(`[PULL] Selected: ${monster.name} (${monster.index}) @${monster.chance}`);
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
