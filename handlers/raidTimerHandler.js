const cron = require('node-cron')
const { RaidBoss } = require('../Models/model.js')

let clientInstance
// Global flag to indicate if rewards for the current raid session have been distributed.
let rewardsDistributed = false;


// Define durations: 1 hour (active) and 1 hour (cooldown)
const ACTIVE_DURATION = 360000 // 1 hour in ms
const COOLDOWN_DURATION = 300000 // 1 hour in ms

const raidBossRotation = {
  currentIndex: 0,
  phase: 'active',
  lastSwitch: Date.now(),
}

async function rotateRaidBoss() {
  if (!clientInstance) {
    console.error('🚨 Client not initialized in raidTimerHandler.')
    return
  }

  const now = Date.now()

  if (raidBossRotation.phase === 'active') {
    if (now - raidBossRotation.lastSwitch >= ACTIVE_DURATION) {
      console.log('⚔️ Active phase expired. Transitioning to cooldown.')

      try {
        const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
        // Reset each boss's health
        await Promise.all(
          raidBosses.map(async (boss) => {
            boss.current_hp = boss.hp
            return boss.save()
          })
        )
      } catch (error) {
        console.error('❌ Error resetting raid boss health on cooldown:', error)
      }

      // Update state to cooldown
      raidBossRotation.phase = 'cooldown'
      raidBossRotation.lastSwitch = now
    }
  } else if (raidBossRotation.phase === 'cooldown') {
    if (now - raidBossRotation.lastSwitch >= COOLDOWN_DURATION) {
      console.log('🔄 Cooldown expired. Rotating to next raid boss.')

      try {
        const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
        if (raidBosses.length > 0) {
          // Rotate to the next boss
          raidBossRotation.currentIndex =
            (raidBossRotation.currentIndex + 1) % raidBosses.length
          const newBoss = raidBosses[raidBossRotation.currentIndex]
          newBoss.current_hp = newBoss.hp
          await newBoss.save()
          console.log(`🆕 New Raid Boss: ${newBoss.name}`)
        } else {
          console.log('No raid bosses found in the database.')
        }
      } catch (error) {
        console.error('❌ Error rotating raid boss:', error)
      }

      // Transition back to active phase
      raidBossRotation.phase = 'active'
      raidBossRotation.lastSwitch = now
    }
  }
}

function initializeRaidTimer(client) {
  clientInstance = client // Store client instance
  console.log('🛠 Raid Timer Initialized.')
  // Run the rotateRaidBoss function every minute
  cron.schedule('* * * * *', rotateRaidBoss)
}

module.exports = { raidBossRotation, initializeRaidTimer }
