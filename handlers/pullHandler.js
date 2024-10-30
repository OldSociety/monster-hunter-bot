const fs = require('fs')
const path = require('path')

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

      const imageUrl = `https://raw.githubusercontent.com/theoperatore/dnd-monster-api/master/src/db/assets/${monster.index}.jpg`
      const matchingTier = defaultTiers.find(
        (tier) => cr >= tier.crRange[0] && cr <= tier.crRange[1]
      )
      if (matchingTier) {
        monsterCacheByTier[matchingTier.name].push({
          name: monsterDetails.name,
          cr,
          type: monsterDetails.type,
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

function selectTier(customTiers = defaultTiers) {
  const roll = Math.random()
  let cumulative = 0

  for (const tier of customTiers) {
    cumulative += tier.chance
    if (roll < cumulative) return tier
  }
  return customTiers[0]
}

async function pullValidMonster(tier, maxAttempts = 10) {
  let attempts = 0
  let monster

  do {
    const eligibleMonsters = monsterCacheByTier[tier.name]
    monster =
      eligibleMonsters[Math.floor(Math.random() * eligibleMonsters.length)]

    attempts++
    if (!monster || !monster.imageUrl.includes('githubusercontent.com')) {
      monster = null
    }
  } while (!monster && attempts < maxAttempts)

  return monster
}

module.exports = {
  cacheMonstersByTier,
  selectTier,
  pullValidMonster,
}
