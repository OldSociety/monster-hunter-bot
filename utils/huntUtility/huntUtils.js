// huntUtils.js
function checkAdvantage(playerStyle, monsterType) {
  const monsterCategory = determineCategory(monsterType)
  const advantageMap = { brute: 'sneak', sneak: 'caster', caster: 'brute' }
  return advantageMap[playerStyle] === monsterCategory
}

function determineCategory(type) {
  const normalizedType = type.toLowerCase()
  if (['construct', 'dragon', 'giant', 'monstrosity'].includes(normalizedType))
    return 'brute'
  if (
    ['aberration', 'celestial', 'elemental', 'fey', 'fiend'].includes(
      normalizedType
    )
  )
    return 'caster'
  if (['plant', 'ooze', 'humanoid', 'beast', 'undead'].includes(normalizedType))
    return 'sneak'
  return 'brute' // Default to 'brute' if type is unrecognized
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
  const colorMap = { brute: '#FF0000', caster: '#0000FF', sneak: '#800080' }
  return colorMap[style]
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

module.exports = {
  checkAdvantage,
  calculateWinChance,
  getEmbedColor,
  capitalize,
}