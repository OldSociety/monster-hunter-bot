const cron = require('node-cron')
const { EmbedBuilder } = require('discord.js')
const { RaidBoss } = require('../Models/model.js')
const {
  globalRaidParticipants,
} = require('../commands/Raid/raidUtils/raidState.js')
const {
  processGlobalRaidRewards,
} = require('../commands/Raid/raidUtils/raidRewardsProcessor.js')
const {
  formatTimeRemaining,
} = require('../commands/Raid/raidUtils/timeUtils.js')

let clientInstance

const RAID_START_TIME = '0 6 * * 1' // Monday at 6 AM
const RAID_END_TIME = '0 6 * * 6' // Saturday at 6 AM

const TEST_MODE = false

const TEST_ACTIVE_DURATION_MS = 60 * 1000 // 1 minute
const TEST_COOLDOWN_DURATION_MS = 60 * 1000 // 1 minute

const raidBossRotation = {
  currentIndex: 0,
  phase: 'cooldown', // default state (will be updated on schedule)
  lastSwitch: Date.now(),
}
function createRaidAnnouncementEmbed(raidBoss) {
  return new EmbedBuilder()
    .setTitle(`New Raid Started: ${raidBoss.name}`)
    .setDescription(
      `**Boss HP:** ${raidBoss.hp}\n` +
        `**Combat Type:** ${raidBoss.combatType}\n` +
        `Prepare to battle and claim your rewards!`
    )
    .setImage(raidBoss.imageUrl)
    .setColor('#FFD700')
    .setFooter({
      text: `Raid ends in \`${formatTimeRemaining(getTimeUntilCooldown())}\``,
    })
}

function isRaidActive() {
  if (TEST_MODE) {
    // In test mode, use the rotation phase rather than always returning true.
    return raidBossRotation.phase === 'active'
  }
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  // Active window: Monday 6 AM to Saturday 6 AM.
  return (
    (day === 1 && hour >= 6) || (day > 1 && day < 6) || (day === 6 && hour < 6)
  )
}

function updateRaidPhaseOnStartup() {
  if (isRaidActive()) {
    raidBossRotation.phase = 'active'
  } else {
    raidBossRotation.phase = 'cooldown'
  }
  raidBossRotation.lastSwitch = Date.now()
  console.log(
    `[Raid Phase Startup] Raid phase set to "${
      raidBossRotation.phase
    }" at ${new Date(raidBossRotation.lastSwitch).toLocaleString()}`
  )
}

function getNextActiveTime() {
  if (TEST_MODE) {
    return TEST_COOLDOWN_DURATION_MS
  }
  if (isRaidActive()) {
    return 0
  }
  const now = new Date()
  // If today is Monday before 6 AM, next active is later today.
  if (now.getDay() === 1 && now.getHours() < 6) {
    const nextActive = new Date(now)
    nextActive.setHours(6, 0, 0, 0)
    return nextActive.getTime() - now.getTime()
  }
  // Otherwise, next active period is next Monday at 6 AM.
  let daysUntilMonday = (8 - now.getDay()) % 7
  if (daysUntilMonday === 0) {
    daysUntilMonday = 7
  }
  const nextActive = new Date(now)
  nextActive.setDate(now.getDate() + daysUntilMonday)
  nextActive.setHours(6, 0, 0, 0)
  return nextActive.getTime() - now.getTime()
}

function getTimeUntilCooldown() {
  if (TEST_MODE) {
    const remaining =
      TEST_ACTIVE_DURATION_MS - (Date.now() - raidBossRotation.lastSwitch)
    return remaining > 0 ? remaining : 0
  }
  const now = new Date()
  let nextCooldown
  // If within active window, cooldown starts at Saturday 6 AM.
  if (now.getDay() >= 1 && now.getDay() < 6) {
    let daysUntilSaturday = 6 - now.getDay()
    nextCooldown = new Date(now)
    nextCooldown.setDate(now.getDate() + daysUntilSaturday)
    nextCooldown.setHours(6, 0, 0, 0)
  } else if (now.getDay() === 6 && now.getHours() < 6) {
    nextCooldown = new Date(now)
    nextCooldown.setHours(6, 0, 0, 0)
  } else {
    // Outside the active window return 0.
    return 0
  }
  return nextCooldown.getTime() - now.getTime()
}

async function enterCooldownEarly() {
  console.log('⚔️ Boss defeated! Transitioning to cooldown immediately.')
  try {
    const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
    await Promise.all(
      raidBosses.map(async (boss) => {
        boss.current_hp = boss.hp
        return boss.save()
      })
    )
  } catch (error) {
    console.error('❌ Error resetting raid boss health:', error)
  }
  raidBossRotation.phase = 'cooldown'
  raidBossRotation.lastSwitch = Date.now()
}

async function getNextBoss() {
  try {
    let nextBoss = await RaidBoss.findOne({
      where: { active: false },
      order: [['id', 'ASC']],
    })
    // console.log('Initial query result for nextBoss:', nextBoss)

    // If no inactive boss is found, reset all bosses.
    if (!nextBoss) {
      console.log('No inactive boss found. Resetting all bosses to inactive.')
      await RaidBoss.update({ active: false }, { where: {} })
      nextBoss = await RaidBoss.findOne({
        where: { active: false },
        order: [['id', 'ASC']],
      })
      console.log('After reset, nextBoss:', nextBoss)
    }

    // If we still have no boss, log an error and return null.
    if (!nextBoss) {
      console.error('getNextBoss: No boss found even after reset.')
      return null
    }

    // Mark the boss as active using direct assignment.
    nextBoss.active = true
    await nextBoss.save()
    await nextBoss.reload()
    console.log('Boss updated to active:', nextBoss.active)
    return nextBoss
  } catch (error) {
    console.error('Error in getNextBoss:', error)
    throw error
  }
}

async function activateRaid() {
  try {
    // Use the active flag to select the next boss.
    const newBoss = await getNextBoss()
    if (!newBoss) {
      console.error('activateRaid: No valid boss returned.')
      return
    }

    // Reset the boss's health.
    newBoss.current_hp = newBoss.hp
    await newBoss.save()

    const announcementEmbed = createRaidAnnouncementEmbed(newBoss)

    let channel
    if (process.env.NODE_ENV === 'development') {
      channel = clientInstance.channels.cache.get(
        process.env.DEVBOTTESTCHANNELID
      )
    } else {
      channel = clientInstance.channels.cache.get(process.env.BHUNTERCHANNELID)
    }

    await channel.send({ embeds: [announcementEmbed] })
  } catch (error) {
    console.error('❌ Error rotating raid boss:', error)
  }

  raidBossRotation.phase = 'active'
  raidBossRotation.lastSwitch = Date.now()
}

async function enterCooldown() {
  console.log('🔴 Entering Cooldown Phase!')
  raidBossRotation.phase = 'cooldown'
  raidBossRotation.lastSwitch = Date.now()

  try {
    const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
    const selectedBoss = raidBosses[raidBossRotation.currentIndex]
    const raidBoss = {
      name: selectedBoss.name,
      index: selectedBoss.index,
      type: selectedBoss.type,
      combatType: selectedBoss.combatType,
      hp: selectedBoss.hp,
      current_hp: selectedBoss.current_hp,
      loot1: selectedBoss.loot1,
      loot2: selectedBoss.loot2,
      loot3: selectedBoss.loot3,
      boss_score: selectedBoss.boss_score,
      imageUrl: selectedBoss.imageUrl,
      lootDrops: selectedBoss.lootDrops || [],
      activePhase: false,
      instance: selectedBoss,
    }

    const channel = clientInstance.channels.cache.get(
      process.env.DEVBOTTESTCHANNELID
    )

    // Calculate the time remaining until the next active period.
    const cooldownDuration = getNextActiveTime()
    const now = Date.now()
    const elapsed = now - raidBossRotation.lastSwitch
    const timeRemaining = Math.max(0, cooldownDuration - elapsed)

    const { summaryEmbed, monsterRewardEmbeds } =
      await processGlobalRaidRewards(raidBoss, globalRaidParticipants)
    summaryEmbed.setTitle("This week's Raid is over.")
    summaryEmbed.setFooter({
      text: `Raids will restart in \`${formatTimeRemaining(timeRemaining)}\`.`,
    })

    // Then send the embeds (for example, combined in one message)
    await channel.send({ embeds: [summaryEmbed, ...monsterRewardEmbeds] })

    selectedBoss.participants = []
    await selectedBoss.save()
  } catch (error) {
    console.error('[Cooldown] Error processing global rewards:', error)
  }
}

async function runTestModeCycle() {
  console.log('🚀 [Test Mode] Activating new raid phase.')
  await activateRaid()
  setTimeout(async () => {
    console.log('🚀 [Test Mode] Entering cooldown phase.')
    await enterCooldown()
    setTimeout(runTestModeCycle, TEST_COOLDOWN_DURATION_MS)
  }, TEST_ACTIVE_DURATION_MS)
}
async function initializeRaidTimer(client) {
  clientInstance = client
  // console.log('🛠 Raid Timer Initialized.')

  // Update the raid phase on startup based on the current time.
  updateRaidPhaseOnStartup()

  cron.schedule(RAID_START_TIME, activateRaid)
  cron.schedule(RAID_END_TIME, enterCooldown)
  if (TEST_MODE) {
    console.log('🚀 Test Mode Active!')
    runTestModeCycle() // Start the recursive test mode cycle.
  }
}

module.exports = {
  raidBossRotation,
  initializeRaidTimer,
  enterCooldownEarly,
  getNextActiveTime,
  isRaidActive,
  getTimeUntilCooldown,
}
