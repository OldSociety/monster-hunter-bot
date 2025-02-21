const cron = require('node-cron')
const { RaidBoss } = require('../Models/model.js')

let clientInstance
let rewardsDistributed = false

// Set actual raid schedule
const RAID_START_TIME = '0 6 * * 1' // Every Monday at 6 AM
const RAID_END_TIME = '0 6 * * 6' // Every Saturday at 6 AM

// Set TEST MODE (For testing in minutes)
const TEST_MODE = false
const TEST_ACTIVE_DURATION = '*/2 * * * *' // Every 2 minutes
const TEST_COOLDOWN_DURATION = '*/1 * * * *' // Every 1 minute

const raidBossRotation = {
  currentIndex: 0,
  phase: 'cooldown',
  lastSwitch: Date.now(),
}

// Immediately enter cooldown when a boss is defeated
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

// Activate raid on Mondays
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
    } else {
      console.log('No raid bosses found.')
    }
  } catch (error) {
    console.error('❌ Error rotating raid boss:', error)
  }

  raidBossRotation.phase = 'active'
  raidBossRotation.lastSwitch = Date.now()
}

// Enter cooldown on Saturdays
async function enterCooldown() {
  console.log('🔴 Entering Cooldown Phase!')
  raidBossRotation.phase = 'cooldown'
  raidBossRotation.lastSwitch = Date.now()
}

// Initialize scheduler
function initializeRaidTimer(client) {
  clientInstance = client
  console.log('🛠 Raid Timer Initialized.')

  // ✅ Real Schedule
  cron.schedule(RAID_START_TIME, activateRaid)
  cron.schedule(RAID_END_TIME, enterCooldown)

  // ✅ Test Mode (For debugging)
  if (TEST_MODE) {
    console.log('🚀 Test Mode Active!')
    cron.schedule(TEST_ACTIVE_DURATION, activateRaid)
    cron.schedule(TEST_COOLDOWN_DURATION, enterCooldown)
  }
}

module.exports = { raidBossRotation, initializeRaidTimer, enterCooldownEarly }
