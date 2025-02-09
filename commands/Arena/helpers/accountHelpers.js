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
      max_hp: 5,
      strength: 4,
      defense: 4,
      intelligence: 4,
      agility: 4,
      statPoints: 10,
    })
  }

  return player
}

function determineFirstTurn(playerAgi, monsterAgi) {
  const total = playerAgi + monsterAgi
  const result = Math.random() < playerAgi / total ? 'player' : 'monster'
  console.log(`[TURN] First Turn Determined: ${result}`)
  return result
}

function calculateFinalDamage(
  dMin,
  dMax,
  attackerAgi,
  defenderAgi,
  damageType,
  monster
) {
  // Step 1: Calculate base damage with agility effects
  let baseDamage = calculateDamageWithAgility(
    dMin,
    dMax,
    attackerAgi,
    defenderAgi
  )

  console.log(`[DAMAGE] Base damage before resistances: ${baseDamage}`)

  // Step 2: Apply resistances
  let resistanceValue = 0
  if (monster.resistance) {
    const resistances = JSON.parse(monster.resistance)
    resistanceValue = resistances[damageType] || 0 // Default to 0 if no resistance exists

    if (resistanceValue === 100) {
      console.log(
        `[RESISTANCE] ${monster.name} is completely immune to ${damageType}!`
      )
      return {
        damage: 0,
        message: `${monster.name} is **immune** to ${damageType}!`,
      }
    }

    if (resistanceValue > 0) {
      baseDamage -= baseDamage * (resistanceValue / 100) // Reduce damage by percentage
    } else if (resistanceValue < 0) {
      baseDamage += Math.abs(resistanceValue) // Add extra damage if negative resistance
    }
  }

  console.log(
    `[RESISTANCE] Adjusted damage after resistance (${resistanceValue}%): ${baseDamage}`
  )

  // Step 3: Apply monster's defense
  let finalDamage = Math.max(baseDamage - monster.defense, 0)

  console.log(
    `[DAMAGE] Final damage after defense: ${finalDamage} (Monster Defense: ${monster.defense})`
  )

  // Step 4: Ensure minimum damage of 1 (unless fully immune)
  return { damage: Math.max(finalDamage, 1), message: null }
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

module.exports = {
  getOrCreatePlayer,
  calculateDamageWithAgility,
  calculateFinalDamage,
  getBoostMultiplier,
  determineFirstTurn,
}
