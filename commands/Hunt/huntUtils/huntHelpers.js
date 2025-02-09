// huntHelpers.js
function checkAdvantage(playerStyle, monsterType) {
  const monsterCategory = classifyMonsterType(monsterType)

  // Advantage and Disadvantage Mappings
  const advantageMap = {
    brute: 'stealth',
    stealth: 'spellsword',
    spellsword: 'brute',
  }
  const disadvantageMap = {
    stealth: 'brute',
    spellsword: 'stealth',
    brute: 'spellsword',
  }

  if (advantageMap[playerStyle] === monsterCategory) return 1.15 // Advantage multiplier
  if (disadvantageMap[playerStyle] === monsterCategory) return 0.85 // Disadvantage multiplier

  return 1 // No advantage/disadvantage
}

function energyCostToEmoji(cost) {
  const boltEmoji = '⚡'
  return boltEmoji.repeat(cost)
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

function calculateWinChance(playerScore, monsterScore, isAdvantaged) {
  const baseWinChance = Math.round(
    (playerScore / (playerScore + monsterScore)) * 100
  )
  const adjustedWinChance = isAdvantaged
    ? Math.min(baseWinChance + 25, 100)
    : baseWinChance
  return { base: baseWinChance, adjusted: adjustedWinChance }
}

function getEmbedColor(style) {
  const colorMap = {
    brute: '#FF0000',
    spellsword: '#0000FF',
    stealth: '#800080',
  }
  return colorMap[style]
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

module.exports = {
  checkAdvantage,
  calculateWinChance,
  classifyMonsterType,
  energyCostToEmoji,
  getEmbedColor,
  capitalize,
}
