const fs = require('fs')
const path = require('path')
const {
  classifyMonsterType,
} = require('../commands/Hunt/huntUtils/huntHelpers.js')

// Path to the assets folder and setup for valid creatures
const assetsPath = path.join(__dirname, '..', 'assets')
const creatureFiles = fs.readdirSync(assetsPath)
const validCreatures = new Set(
  creatureFiles.map((filename) => path.parse(filename).name)
)

// EXCLUDED TYPES
const excludedTypes = new Set([
  // 'dragon',
  // Add other types you want to exclude
])

const monsterCacheByCR = {}
let cachePopulated = false

async function cacheHuntMonsters() {
  if (cachePopulated) return //

  const fetch = (await import('node-fetch')).default
  const response = await fetch('https://www.dnd5eapi.co/api/monsters')
  const data = await response.json()

  for (const monsterSummary of data.results) {
    try {
      // Check if monster has a valid image
      if (!validCreatures.has(monsterSummary.index)) continue

      const monsterResponse = await fetch(
        `https://www.dnd5eapi.co/api/monsters/${monsterSummary.index}`
      )
      const monster = await monsterResponse.json()

      // Exclude certain monster types
      if (
        excludedTypes.has(monster.type?.toLowerCase()) ||
        monster.type?.toLowerCase().includes('swarm')
      ) {
        continue
      }

      // Use classifyMonsterType from huntUtils.js
      const combatType = classifyMonsterType(monster.type)

      // Parse CR correctly
      let cr = monster.challenge_rating
      if (typeof cr === 'string' && cr.includes('/')) {
        const [numerator, denominator] = cr.split('/').map(Number)
        cr = numerator / denominator
      }

      if (!monsterCacheByCR[cr]) {
        monsterCacheByCR[cr] = []
      }

      monsterCacheByCR[cr].push({
        name: monster.name,
        cr,
        hp: monster.hit_points,
        type: monster.type,
        combatType,
        index: monster.index,
      })
    } catch (error) {
      console.log(`Error processing monster ${monsterSummary.name}:`, error)
    }
  }
  cachePopulated = true
  console.log('Hunt monster cache populated with combat types.')
}

function pullMonsterByCR(cr) {
  const availableMonsters = monsterCacheByCR[cr]
  if (!availableMonsters || availableMonsters.length === 0) {
    console.log(`No monsters available for CR ${cr}.`)
    return null
  }
  return availableMonsters[Math.floor(Math.random() * availableMonsters.length)]
}
function pullSpecificMonster(index) {
  console.log(index)
  for (const cr in monsterCacheByCR) {
    const foundMonster = monsterCacheByCR[cr].find(
      (monster) => monster.index === index
    )
    if (foundMonster) {
      console.log(foundMonster)
      return foundMonster
    }
  }
  return null
}

module.exports = { cacheHuntMonsters, pullMonsterByCR, pullSpecificMonster }
