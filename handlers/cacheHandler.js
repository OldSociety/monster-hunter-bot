const fs = require('fs')
const path = require('path')

const {
  classifyMonsterType,
} = require('../commands/Hunt/huntUtils/huntHelpers.js')
const { Op } = require('sequelize')
const { allowedMonstersByPack } = require('../utils/shopMonsters')
const { calculateMScore } = require('../handlers/userMonsterHandler.js')
const { updateOrAddMonsterToCollection } = require('./userMonsterHandler')

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args))

const assetsPath = path.join(__dirname, '..', 'assets')
const creatureFiles = fs.readdirSync(assetsPath)
const validCreatures = new Set(
  creatureFiles.map((filename) => path.parse(filename).name)
)

const excludedTypes = new Set([
  // Add any types to exclude (e.g., 'swarm')
])

const monsterCache = []

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

let cachePopulated = false

async function populateMonsterCache() {
  if (cachePopulated) {
    console.log('[CACHE] Already populated, skipping.')
    return
  }

  console.log('[CACHE] Fetching monster list from API...')

  try {
    const response = await fetch('https://www.dnd5eapi.co/api/monsters')
    if (!response.ok) throw new Error(`API response error: ${response.status}`)

    const data = await response.json()
    let addedCount = 0

    // Reset both caches
    global.monsterCacheByTier = {
      Common: [],
      Uncommon: [],
      Rare: [],
      'Very Rare': [],
      Legendary: [],
    }
    global.monsterCache = [] // ✅ Ensure global.monsterCache exists

    for (const monster of data.results) {
      try {
        if (!validCreatures.has(monster.index)) continue

        const detailResponse = await fetch(
          `https://www.dnd5eapi.co/api/monsters/${monster.index}`
        )
        if (!detailResponse.ok) {
          console.warn(
            `[CACHE] Failed to fetch details for ${monster.index}. Skipping.`
          )
          continue
        }

        const monsterDetails = await detailResponse.json()
        let cr = monsterDetails.challenge_rating

        if (typeof cr === 'string' && cr.includes('/')) {
          const [numerator, denominator] = cr.split('/').map(Number)
          cr = numerator / denominator
        }

        if (cr === undefined || cr === null) continue

        const rarity = getRarityByCR(cr)
        const color =
          defaultTiers.find((tier) => tier.name === rarity)?.color || 0x808080
        const combatType = classifyMonsterType(monsterDetails.type)
        const imageUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${monster.index}.jpg`

        const monsterData = {
          name: monsterDetails.name,
          index: monster.index,
          cr,
          type: monsterDetails.type,
          hp: monsterDetails.hit_points,
          combatType,
          rarity,
          imageUrl,
          color,
        }

        global.monsterCacheByTier[rarity].push(monsterData) // ✅ Store in tiered cache
        global.monsterCache.push(monsterData) // ✅ Store in global cache for quick lookups

        addedCount++
      } catch (error) {
        console.warn(
          `[CACHE] Error processing monster ${monster.name}: ${error.message}`
        )
      }
    }

    console.log(`[CACHE] Successfully stored ${addedCount} monsters.`)
    cachePopulated = true
  } catch (error) {
    console.error('[CACHE] Failed to fetch monster data:', error)
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

  // Ensure cache exists before searching
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
    ) // Show first 5
    return null
  }

  console.log(`[PULL] Found ${index} in monsterCache!`, foundMonster)

  // ✅ Ensure mScore is calculated before returning
  const mScore = calculateMScore(foundMonster.cr, foundMonster.rarity, 1)

  return { ...foundMonster, mScore } // ✅ Now includes mScore
}

const testMonsters = [
  { name: 'Goblin', cr: 0.25, rarity: 'Common' },
  { name: 'Fire Elemental', cr: 5, rarity: 'Rare' },
  { name: 'Ancient Black Dragon', cr: 21, rarity: 'Legendary' },
]

testMonsters.forEach((monster) => {
  const testMScore = calculateMScore(monster.cr, monster.rarity, 1)
  console.log(
    `[TEST] ${monster.name} (CR ${monster.cr}, ${monster.rarity}): mScore = ${testMScore}`
  )
})
function selectTier(customTiers) {
  const roll = Math.random()
  let cumulative = 0

  for (const tier of customTiers) {
    cumulative += tier.chance
    if (roll < cumulative) return tier.name
  }
  return customTiers[0].name
}

async function pullValidMonster(
  tierOption,
  packType,
  userId,
  maxAttempts = 10
) {
  let attempts = 0
  let monster

  // ✅ Ensure allowed monsters exist
  const allowedMonstersSet = allowedMonstersByPack[packType]
  if (!allowedMonstersSet || allowedMonstersSet.size === 0) {
    console.warn(
      `[PULL ERROR] No allowed monsters defined for pack: ${packType}`
    )
    return null
  }

  do {
    const tierName =
      packType === 'elemental' && tierOption.customTiers
        ? selectTier(tierOption.customTiers)
        : tierOption.name

    const eligibleMonsters = global.monsterCacheByTier?.[tierName] || []

    console.log(
      `[PULL] Checking ${tierName} tier - ${eligibleMonsters.length} available`
    )

    // ✅ Filter only allowed monsters
    const filteredMonsters = eligibleMonsters.filter((monster) =>
      allowedMonstersSet.has(monster.index)
    )

    console.log(
      `[PULL] Allowed monsters after filtering: ${filteredMonsters.length}`
    )

    if (!filteredMonsters.length) {
      console.warn(
        `[PULL ERROR] No eligible monsters in tier: ${tierName} after filtering`
      )
      return null
    }

    monster =
      filteredMonsters[Math.floor(Math.random() * filteredMonsters.length)]
    attempts++
  } while (!monster && attempts < maxAttempts)

  if (monster) {
    console.log(
      `[PULL] Successfully pulled ${monster.name}. Adding to collection.`
    )
    // ✅ Now updates the collection when a monster is pulled
    await updateOrAddMonsterToCollection(userId, monster)
  }

  return monster
}

async function fetchMonsterByName(name) {
  if (!cachePopulated) {
    console.log('[FETCH] Cache not populated. Populating cache now...')
    await populateMonsterCache()
  }

  for (const tier of Object.values(monsterCache)) {
    const monster = tier.find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    )
    if (monster) return monster
  }

  console.warn(`[FETCH] Monster ${name} not found in cache.`)
  return null
}

module.exports = {
  populateMonsterCache,
  pullMonsterByCR,
  pullSpecificMonster,
  pullValidMonster,
  fetchMonsterByName,
  selectTier,
}
