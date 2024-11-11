// huntUtils.js
function checkAdvantage(playerStyle, monsterType) {
  const monsterCategory = determineCategory(monsterType)
  const advantageMap = { brute: 'stealth', stealth: 'spellsword', spellsword: 'brute' }
  return advantageMap[playerStyle] === monsterCategory
}

function determineCategory(type) {
  const normalizedType = type.toLowerCase()
  if (['beast', 'construct', 'dragon', 'giant', 'monstrosity'].includes(normalizedType))
    return 'brute'
  if (
    ['aberration', 'celestial', 'elemental', 'fey', 'fiend'].includes(
      normalizedType
    )
  )
    return 'spellsword'
  if (['plant', 'ooze', 'humanoid','undead'].includes(normalizedType))
    return 'stealth'
  return 'brute'
}

function energyCostToEmoji(cost) {
  const boltEmoji = '⚡'
  return boltEmoji.repeat(cost)
}

function classifyMonsterType(type) {
  const bruteTypes = ['giant', 'monstrosity', 'dragon', 'construct'];
  const spellswordTypes = ['aberration', 'celestial', 'elemental', 'fey', 'fiend'];
  const stealthTypes = ['humanoid', 'beast', 'undead', 'plant', 'ooze'];

  if (bruteTypes.includes(type.toLowerCase())) return 'brute';
  if (spellswordTypes.includes(type.toLowerCase())) return 'spellsword';
  if (stealthTypes.includes(type.toLowerCase())) return 'stealth';
  return 'brute'; // Default if type is unclassified
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
  const colorMap = { brute: '#FF0000', spellsword: '#0000FF', stealth: '#800080' }
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
