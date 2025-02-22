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

const TEST_MODE = true
const TEST_ACTIVE_DURATION = '*/2 * * * *'
const TEST_COOLDOWN_DURATION = '*/1 * * * *'

const TEST_ACTIVE_DURATION_MS = 2 * 60 * 1000 // 2 minutes
const TEST_COOLDOWN_DURATION_MS = 1 * 60 * 1000 // 1 minute

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
    .setFooter({ text: 'Good luck, hunter!' })
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

async function activateRaid() {
  console.log('🟢 Activating Raid Phase!')
  try {
    const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
    if (raidBosses.length > 0) {
      raidBossRotation.currentIndex =
        (raidBossRotation.currentIndex + 1) % raidBosses.length
      const newBoss = raidBosses[raidBossRotation.currentIndex]
      newBoss.current_hp = newBoss.hp
      await newBoss.save()
      console.log(`🆕 New Raid Boss: ${newBoss.name}`)

      const announcementEmbed = createRaidAnnouncementEmbed(newBoss)
      const channel = clientInstance.channels.cache.get(
        process.env.DEVBOTTESTCHANNELID
      )
      await channel.send({ embeds: [announcementEmbed] })
    } else {
      console.log('No raid bosses found.')
    }
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

    console.log('[Cooldown] Processing end-of-raid popup.')

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
    text: `Raids will restart in ${formatTimeRemaining(timeRemaining)}.`,
  })

    console.log('[Cooldown] Summary embed built. Attempting to send embed.')
   // Then send the embeds (for example, combined in one message)
   await channel.send({ embeds: [summaryEmbed, ...monsterRewardEmbeds] })

  } catch (error) {
    console.error('[Cooldown] Error processing global rewards:', error)
  }
}

function initializeRaidTimer(client) {
  clientInstance = client
  console.log('🛠 Raid Timer Initialized.')
  cron.schedule(RAID_START_TIME, activateRaid)
  cron.schedule(RAID_END_TIME, enterCooldown)
  if (TEST_MODE) {
    console.log('🚀 Test Mode Active!')
    // In test mode, immediately start an active raid then schedule recurring jobs.
    activateRaid()
    cron.schedule(TEST_ACTIVE_DURATION, activateRaid)
    cron.schedule(TEST_COOLDOWN_DURATION, enterCooldown)
  }
}

module.exports = {
  raidBossRotation,
  initializeRaidTimer,
  enterCooldownEarly,
  getNextActiveTime,
  isRaidActive,
}
