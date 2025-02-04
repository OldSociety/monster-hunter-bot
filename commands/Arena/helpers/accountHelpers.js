const { Arena } = require('../../../Models/model.js')

const STAT_BOOSTS = [
  { threshold: 750, multiplier: 16 },
  { threshold: 700, multiplier: 15 },
  { threshold: 650, multiplier: 14 },
  { threshold: 600, multiplier: 13 },
  { threshold: 550, multiplier: 12 },
  { threshold: 500, multiplier: 11 },
  { threshold: 450, multiplier: 9.75 },
  { threshold: 400, multiplier: 8.5 },
  { threshold: 350, multiplier: 7.5 },
  { threshold: 300, multiplier: 6.5 },
  { threshold: 250, multiplier: 5.5 },
  { threshold: 200, multiplier: 4.5 },
  { threshold: 125, multiplier: 3 },
  { threshold: 85, multiplier: 2.5 },
  { threshold: 55, multiplier: 2 },
  { threshold: 35, multiplier: 1.5 },
  { threshold: 20, multiplier: 1.25 },
  { threshold: 13, multiplier: 1 },
  { threshold: 8, multiplier: 0.75 },
  { threshold: 0, multiplier: 0.5 },
]

async function getOrCreatePlayer(userId, generateBattleEmbed) {
  let player = await Arena.findOne({ where: { userId } })
  if (!player) {
    player = await Arena.create({
      userId,
      hp: 5,
      strength: 4,
      defense: 4,
      intelligence: 4,
      agility: 4,
      statPoints: 10,
    })
  }
  return player
}

async function determineFirstTurn(playerAgi, monsterAgi) {
  const total = playerAgi + monsterAgi
  return Math.random() < playerAgi / total ? 'player' : 'monster'
}

function calculateDamageWithAgility(dMin, dMax, attackerAgi, defenderAgi) {
  const maxEffect = 0.9
  const k = 0.01
  const attackerEffect = maxEffect * (1 - Math.exp(-k * attackerAgi))
  const defenderEffect = maxEffect * (1 - Math.exp(-k * defenderAgi))
  const effectiveSwing = attackerEffect - defenderEffect
  const range = dMax - dMin
  return Math.floor(dMin + range * (0.5 + effectiveSwing / 2))
}

function getBoostMultiplier(stat) {
  for (const boost of STAT_BOOSTS) {
    if (stat >= boost.threshold) return boost.multiplier
  }
  return 0.5
}

module.exports = { getOrCreatePlayer, calculateDamageWithAgility, getBoostMultiplier, determineFirstTurn }
