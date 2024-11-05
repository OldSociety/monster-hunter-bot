let monsterListCache = [] // Cache for hunt monsters

// Function to classify monster types for combat advantage
function classifyMonsterType(type) {
  const bruteTypes = ['giant', 'monstrosity', 'dragon', 'construct']
  const casterTypes = ['aberration', 'celestial', 'elemental', 'fey', 'fiend']
  const stealthTypes = ['humanoid', 'beast', 'undead', 'plant', 'ooze']

  if (bruteTypes.includes(type.toLowerCase())) return 'brute'
  if (casterTypes.includes(type.toLowerCase())) return 'caster'
  if (stealthTypes.includes(type.toLowerCase())) return 'stealth'
  return 'brute' // Default if type is unclassified
}

async function cacheHuntMonsters() {
  if (monsterListCache.length > 0) return // Skip if already cached

  // Import `node-fetch` dynamically
  const fetch = (await import('node-fetch')).default

  const response = await fetch('https://www.dnd5eapi.co/api/monsters')
  const data = await response.json()

  for (const monsterSummary of data.results) {
    const monsterResponse = await fetch(`https://www.dnd5eapi.co/api/monsters/${monsterSummary.index}`)
    const monster = await monsterResponse.json()

    // Classify combat type based on monster type
    const combatType = classifyMonsterType(monster.type)

    // Cache relevant monster data
    monsterListCache.push({
      name: monster.name,
      cr: monster.challenge_rating,
      hp: monster.hit_points,
      combatType,
    })
  }
  console.log('Hunt monster cache populated with combat types.')
}

// Function to pull a monster by CR
function pullMonsterByCR(cr) {
  const monstersByCR = monsterListCache.filter(monster => monster.cr === cr)
  return monstersByCR.length > 0
    ? monstersByCR[Math.floor(Math.random() * monstersByCR.length)]
    : null
}

module.exports = { cacheHuntMonsters, pullMonsterByCR }
