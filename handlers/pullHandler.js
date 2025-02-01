// pullHandler.js
const fs = require('fs')
const path = require('path')
const { Op } = require('sequelize')
const { allowedMonstersByPack } = require('../utils/shopMonsters')
const { updateOrAddMonsterToCollection } = require('./userMonsterHandler')

const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args))

// Read all filenames in the assets folder to create validCreatures set
const assetsPath = path.join(__dirname, '..', 'assets')
const creatureFiles = fs.readdirSync(assetsPath)
const validCreatures = new Set(
  creatureFiles.map((filename) => path.parse(filename).name)
)

const monsterCacheByTier = {
  Common: [],
  Uncommon: [],
  Rare: [],
  'Very Rare': [],
  Legendary: [],
}

let cachePopulated = false

const defaultTiers = [
  { name: 'Common', crRange: [0, 4], color: 0x808080, chance: 0.5 },
  { name: 'Uncommon', crRange: [5, 10], color: 0x00ff00, chance: 0.31 },
  { name: 'Rare', crRange: [11, 15], color: 0x0000ff, chance: 0.17 },
  { name: 'Very Rare', crRange: [16, 19], color: 0x800080, chance: 0.02 },
  { name: 'Legendary', crRange: [20, Infinity], color: 0xffd700, chance: 0 },
]

async function cacheMonstersByTier() {
  if (cachePopulated) {
    console.log('[CACHE] Already populated, skipping.')
    return
  }

  console.log('[CACHE] Fetching monster list from API...')

  try {
    const response = await fetch('https://www.dnd5eapi.co/api/monsters')
    if (!response.ok) throw new Error(`API response error: ${response.status}`)

    const data = await response.json()
    let addedCount = 0 // Track how many monsters are added

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

        const imageUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${monster.index}.jpg`
        const matchingTier = defaultTiers.find(
          (tier) => cr >= tier.crRange[0] && cr <= tier.crRange[1]
        )

        if (matchingTier) {
          // console.log(`[CACHE] Storing ${monsterDetails.name} - HP: ${monsterDetails.hit_points}`);

          monsterCacheByTier[matchingTier.name].push({
            name: monsterDetails.name,
            index: monster.index,
            cr,
            type: monsterDetails.type,
            hp: monsterDetails.hit_points,
            rarity: matchingTier.name,
            imageUrl,
            color: matchingTier.color,
          })

          addedCount++
        }
      } catch (error) {
        console.warn(
          `[CACHE] Error processing monster ${monster.name}: ${error.message}`
        )
      }
    }

    if (addedCount > 0) {
      console.log(`[CACHE] Successfully stored ${addedCount} monsters.`)
    } else {
      console.warn('[CACHE] No monsters were stored. Something went wrong.')
    }

    cachePopulated = true
    console.log('[CACHE] Monster cache populated successfully.')
  } catch (error) {
    console.error('[CACHE] Failed to fetch monster data:', error)
  }
}

// Adjusted selectTier function to accept custom tiers
function selectTier(customTiers) {
  const roll = Math.random()
  let cumulative = 0

  for (const tier of customTiers) {
    cumulative += tier.chance
    if (roll < cumulative) return tier.name
  }
  return customTiers[0].name
}

async function pullValidMonster(tierOption, packType, maxAttempts = 10) {
  let attempts = 0
  let monster

  if (packType === 'starter') {
    const starterMonstersSet = allowedMonstersByPack['starter']
    if (!starterMonstersSet || !starterMonstersSet.size) {
      console.error('[PULL] No monsters defined for the Starter Pack')
      return null
    }
    const starterMonsters = Array.from(starterMonstersSet)
    console.log(`[PULL] Starter Pack contains: ${starterMonsters.join(', ')}`)
    const randomIndex = Math.floor(Math.random() * starterMonsters.length)
    const monsterName = starterMonsters[randomIndex]
    return await fetchMonsterByName(monsterName)
  }

  do {
    let tierName
    if (packType === 'elemental' && tierOption.customTiers) {
      tierName = selectTier(tierOption.customTiers)
    } else {
      tierName = tierOption.name
    }

    const eligibleMonsters = monsterCacheByTier[tierName]
    if (!eligibleMonsters || eligibleMonsters.length === 0) {
      console.warn(`[PULL] No eligible monsters in tier ${tierName}`)
      return null
    }

    let filteredMonsters = eligibleMonsters

    if (packType === 'elemental') {
      filteredMonsters = filteredMonsters.filter(
        (m) => m.type.toLowerCase() === 'elemental'
      )
    } else {
      const allowedMonsters = allowedMonstersByPack[packType]
      if (allowedMonsters) {
        filteredMonsters = filteredMonsters.filter((m) =>
          allowedMonsters.has(m.index)
        )
      }
    }

    if (filteredMonsters.length === 0) {
      console.warn(
        `[PULL] No allowed monsters in tier ${tierName} for pack ${packType}`
      )
      return null
    }

    // Log the filtered monsters
    console.log(
      `[PULL] Pack Type: ${packType}, Tier: ${tierName}, Monsters: ${filteredMonsters
        .map((m) => m.name)
        .join(', ')}`
    )

    monster =
      filteredMonsters[Math.floor(Math.random() * filteredMonsters.length)]

    attempts++
  } while (!monster && attempts < maxAttempts)

  return monster
}

async function fetchMonsterByName(name) {
  if (!cachePopulated) {
    console.log('[FETCH] Cache not populated. Populating cache now...')
    await cacheMonstersByTier()
    console.log('[FETCH] Cache populated successfully.')
  }

  for (const tier of Object.values(monsterCacheByTier)) {
    const monster = tier.find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    )
    if (monster) {
      console.log(`[FETCH] Monster ${name} found in cache.`)
      return monster
    }
  }

  console.warn(`[FETCH] Monster ${name} not found in cache.`)
  return null
}

module.exports = {
  cacheMonstersByTier,
  monsterCacheByTier,
  selectTier,
  pullValidMonster,
  fetchMonsterByName,
  updateOrAddMonsterToCollection,
}
