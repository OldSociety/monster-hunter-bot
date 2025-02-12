const cron = require('node-cron')
const { EmbedBuilder } = require('discord.js')
const { RaidBoss } = require('../Models/model.js')

let clientInstance // Placeholder for client instance

// Global rotation state for Raid Bosses
const raidBossRotation = {
  currentIndex: 0,
  phase: 'active',
  lastSwitch: Date.now(),
}

// Helper function to format time into minutes and seconds
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds}s`
}

// 📌 Function to rotate Raid Boss
async function rotateRaidBoss() {
  if (!clientInstance) {
    console.error('🚨 Client not initialized in raidTimerHandler.')
    return
  }

  const now = Date.now()
  if (raidBossRotation.phase === 'active') {
    if (now - raidBossRotation.lastSwitch >= 60000) {
      console.log('⚔️ Active phase expired. Entering cooldown phase.')

      try {
        const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
        if (raidBosses.length > 0) {
          const currentBoss = raidBosses[raidBossRotation.currentIndex]
          currentBoss.current_hp = currentBoss.hp
          await currentBoss.save()
        }
      } catch (error) {
        console.error('❌ Error resetting Raid Boss health on cooldown:', error)
      }

      raidBossRotation.phase = 'cooldown'
      raidBossRotation.lastSwitch = now

      // Send cooldown embed
      const cooldownDuration = 60000 // 1-minute cooldown (Set to 2 days in production)
      const cooldownEmbed = new EmbedBuilder()
        .setTitle('🔒 Raids are in Cooldown')
        .setDescription(
          `Raids will restart in ${formatTime(cooldownDuration)}.`
        )
        .setColor('Gold')

      const raidChannel = clientInstance.channels.cache.get(
        process.env.RAID_CHANNEL_ID
      )
      if (raidChannel) {
        await raidChannel.send({ embeds: [cooldownEmbed] })
      }
    }
  } else if (raidBossRotation.phase === 'cooldown') {
    if (now - raidBossRotation.lastSwitch >= 60000) {
      console.log('🔄 Cooldown phase expired. Rotating to next Raid Boss.')

      try {
        const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
        if (raidBosses.length > 0) {
          raidBossRotation.currentIndex =
            (raidBossRotation.currentIndex + 1) % raidBosses.length

          const newBoss = raidBosses[raidBossRotation.currentIndex]
          newBoss.current_hp = newBoss.hp
          await newBoss.save()

          console.log(`🆕 New Raid Boss: ${newBoss.name}`)

          // Announce the new Raid Boss
          const newBossEmbed = new EmbedBuilder()
            .setTitle(`⚔️ New Raid Boss Appears!`)
            .setDescription(
              `**${newBoss.name}** has entered the battlefield! Prepare for combat!`
            )
            .setColor('Red')
            .setImage(newBoss.imageUrl)

          const raidChannel = clientInstance.channels.cache.get(
            process.env.RAID_CHANNEL_ID
          )
          if (raidChannel) {
            await raidChannel.send({ embeds: [newBossEmbed] })
          }
        } else {
          console.log('No Raid Bosses found in the database.')
        }
      } catch (error) {
        console.error('❌ Error rotating Raid Boss:', error)
      }

      raidBossRotation.phase = 'active'
      raidBossRotation.lastSwitch = now
    }
  }
}

// 📌 Function to initialize the Raid Timer with the bot client
function initializeRaidTimer(client) {
  clientInstance = client // Store client instance
  console.log('🛠 Raid Timer Initialized.')
  cron.schedule('* * * * *', rotateRaidBoss)
}

module.exports = { raidBossRotation, initializeRaidTimer }
