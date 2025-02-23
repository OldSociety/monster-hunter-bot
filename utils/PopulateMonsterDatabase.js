const { Monster } = require('../Models/model') // ✅ Import Sequelize model

// Define rarity tiers
const defaultTiers = [
  { name: 'Common', crRange: [0, 4], color: 0x808080 },
  { name: 'Uncommon', crRange: [5, 10], color: 0x00ff00 },
  { name: 'Rare', crRange: [11, 15], color: 0x0000ff },
  { name: 'Very Rare', crRange: [16, 19], color: 0x800080 },
  { name: 'Legendary', crRange: [20, Infinity], color: 0xffd700 },
]

// Function to determine rarity by CR
function getRarityByCR(cr) {
  if (cr >= 20) return 'Legendary'
  if (cr >= 16) return 'Very Rare'
  if (cr >= 11) return 'Rare'
  if (cr >= 5) return 'Uncommon'
  return 'Common'
}

function classifyMonsterType(type) {
  const bruteTypes = ['beast', 'construct', 'dragon', 'giant', 'monstrosity']
  const spellswordTypes = [
    'aberration',
    'celestial',
    'elemental',
    'fey',
    'fiend',
  ]
  const stealthTypes = ['humanoid', 'plant', 'ooze', 'undead']

  if (bruteTypes.includes(type.toLowerCase())) return 'brute'
  if (spellswordTypes.includes(type.toLowerCase())) return 'spellsword'
  if (stealthTypes.includes(type.toLowerCase())) return 'stealth'
  return 'brute' // Default if type is unclassified
}

console.log(Monster)

async function populateMonsterDatabase() {
  console.log('[DB] Fetching monster list from API...')

  try {
    const response = await fetch('https://www.dnd5eapi.co/api/monsters')
    if (!response.ok) throw new Error(`API response error: ${response.status}`)

    const data = await response.json()

    for (const monster of data.results) {
      try {
        const detailResponse = await fetch(
          `https://www.dnd5eapi.co/api/monsters/${monster.index}`
        )
        if (!detailResponse.ok)
          throw new Error(`Failed to fetch ${monster.index}`)

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

        // ✅ Use Sequelize's findOrCreate to avoid duplicates
        await Monster.findOrCreate({
          where: { index: monster.index },
          defaults: {
            name: monsterDetails.name,
            cr,
            type: monsterDetails.type,
            hp: monsterDetails.hit_points,
            combatType,
            rarity,
            imageUrl,
            color,
          },
        })

        console.log(`[DB] Inserted or found ${monsterDetails.name}`)
      } catch (error) {
        console.warn(
          `[DB] Error processing monster ${monster.index}:`,
          error.message
        )
      }
    }

    console.log('[DB] Database population complete.')
  } catch (error) {
    console.error('[DB] Failed to fetch monster data:', error.message)
  }
}

// Run the function
populateMonsterDatabase()
