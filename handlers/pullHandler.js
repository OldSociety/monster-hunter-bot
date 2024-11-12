// pullHandler.js
const fs = require('fs')
const path = require('path')
const { allowedMonstersByPack } = require('../utils/shopMonsters')
const { updateOrAddMonsterToCollection } = require('./userMonsterHandler')

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
  if (cachePopulated) return

  const fetch = (await import('node-fetch')).default

  const response = await fetch('https://www.dnd5eapi.co/api/monsters')
  const data = await response.json()

  for (const monster of data.results) {
    try {
      if (!validCreatures.has(monster.index)) continue

      const detailResponse = await fetch(
        `https://www.dnd5eapi.co/api/monsters/${monster.index}`
      )
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
        monsterCacheByTier[matchingTier.name].push({
          name: monsterDetails.name,
          index: monster.index,
          cr,
          type: monsterDetails.type,
          rarity: matchingTier.name,
          imageUrl,
          color: matchingTier.color,
        })
      }
    } catch (error) {
      console.log(`Error processing monster ${monster.name}:`, error)
    }
  }
  cachePopulated = true
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
      console.error('No monsters defined for the Starter Pack')
      return null
    }
    const starterMonsters = Array.from(starterMonstersSet)
    console.log(`Starter Pack contains: ${starterMonsters.join(', ')}`)
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
      console.log(`No eligible monsters in tier ${tierName}`)
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
      console.log(`No allowed monsters in tier ${tierName} for pack ${packType}`)
      return null
    }

    // Log the filtered monsters
    console.log(
      `Pack Type: ${packType}, Tier: ${tierName}, Monsters: ${filteredMonsters.map(m => m.name).join(', ')}`
    )

    monster =
      filteredMonsters[Math.floor(Math.random() * filteredMonsters.length)]

    attempts++
  } while (!monster && attempts < maxAttempts)

  return monster
}

async function fetchMonsterByName(name) {
  // Check if cache is populated; if not, populate it first
  if (!cachePopulated) {
    console.log('Cache not populated. Populating cache now...')
    await cacheMonstersByTier()
    cachePopulated = true
    console.log('Cache populated successfully.')
  }

  for (const tier of Object.values(monsterCacheByTier)) {
    const monster = tier.find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    )
    if (monster) {
      console.log(`Monster ${name} found in cache.`)
      return monster // Return the monster if found
    }
  }

  // If not found in the cache, log and return null
  console.log(`Monster ${name} not found in cache.`)
  return null
}

module.exports = {
  cacheMonstersByTier,
  selectTier,
  pullValidMonster,
  fetchMonsterByName,
  updateOrAddMonsterToCollection,
}
