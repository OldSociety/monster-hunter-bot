const { createHealthBar } = require('../../Hunt/huntUtils/battleHandler.js')
const { User } = require('../../../Models/model')
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { getNextActiveTime } = require('../../../handlers/raidTimerHandler') // Adjust path as needed
const { globalRaidParticipants } = require('./raidState')
const {  formatTimeRemaining} = require('./timeUtils.js')
// const {  processGlobalRaidRewards} = require('./raidRewardsProcessor.js')


function getUserFooter(user) {
  const gold = user.gold || 0
  const currency = user.currency || {}
  return `Available: 🪙${gold} ⚡${currency.energy || 0} 🧿${
    currency.tokens || 0
  } 🥚${currency.eggs || 0} 🧪${currency.ichor || 0} ⚙️${currency.gear || 0}`
}

function updateFooter() {
  const now = Date.now()
  const nextActive = getNextActiveTime()
  const remainingMs = Math.max(nextActive - now, 0)
  return `Raids will restart in ${formatTimeRemaining(remainingMs)}.`
}

function createWelcomeEmbed(raidBoss, user) {
  const playerHealthBar = createHealthBar(user.current_raidHp, user.score)
  return new EmbedBuilder()
    .setTitle(`Current Boss: ${raidBoss.name} (${raidBoss.hp})`)
    .setDescription(
      '**Welcome to Raids!** Join forces with other hunters to battle the most powerful bosses. Defeat the boss for exclusive loot and a legendary card.\n\n' +
        `**Your HP:** ${user.current_raidHp} / ${user.score}\n${playerHealthBar}\n\n`
    )
    .setColor('#FFD700')
    .setThumbnail(raidBoss.imageUrl)
    .setFooter({ text: getUserFooter(user) })
}

function createRaidBossEmbed(raidBoss, user) {
  const lootDrops = [raidBoss.loot1, raidBoss.loot2, raidBoss.loot3].filter(
    Boolean
  )
  const rarityEmojis = ['🟢', '🔵', '🟣']
  const formattedLootDrops = lootDrops
    .map((loot, index) => {
      const formattedLoot = loot
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      return `${rarityEmojis[index] || ''} ${formattedLoot}`
    })
    .join('\n')
  const playerHealthBar = createHealthBar(user.current_raidHp, user.score)
  const bossHealthBar = createHealthBar(raidBoss.current_hp, raidBoss.hp)
  return new EmbedBuilder()
    .setTitle(raidBoss.name)
    .setDescription(
      `**Your HP:** ${user.current_raidHp} / ${user.score}\n${playerHealthBar}\n\n` +
        `**Boss HP:** ${raidBoss.current_hp} / ${raidBoss.hp}\n${bossHealthBar}\n\n` +
        `**Possible Loot Drops:**\n${formattedLootDrops}`
    )
    .setColor('#FF4500')
    .setThumbnail(
      `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${raidBoss.combatType}C.png`
    )
    .setImage(raidBoss.imageUrl)
    .setFooter({ text: getUserFooter(user) })
}

function createInitialActionRow(user) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('initiate_raid')
      .setLabel('Begin Raid!')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('heal')
      .setLabel('Heal (100 HP/🧿token)')
      .setStyle(ButtonStyle.Success)
      .setDisabled(user.currency.tokens < 1),
    new ButtonBuilder()
      .setCustomId('cancel_raid')
      .setLabel('Cancel Raid')
      .setStyle(ButtonStyle.Danger)
  )
}

function createUpdatedActionRow(user) {
  const styleButtons = []
  const styles = ['brute', 'spellsword', 'stealth']
  const styleColors = {
    brute: ButtonStyle.Danger,
    spellsword: ButtonStyle.Primary,
    stealth: ButtonStyle.Success,
  }
  styles.forEach((style) => {
    if (user[`${style}_score`] > 0) {
      styleButtons.push(
        new ButtonBuilder()
          .setCustomId(`style_${style}`)
          .setLabel(
            `${style.charAt(0).toUpperCase() + style.slice(1)}: ${
              user[`${style}_score`]
            }`
          )
          .setStyle(styleColors[style])
      )
    }
  })
  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_raid')
    .setLabel('Cancel Raid')
    .setStyle(ButtonStyle.Secondary)
  const updatedRow = new ActionRowBuilder()
  styleButtons.forEach((btn) => updatedRow.addComponents(btn))
  updatedRow.addComponents(cancelButton)
  return updatedRow
}

module.exports = {
  formatTimeRemaining,
  getUserFooter,
  createWelcomeEmbed,
  createRaidBossEmbed,
  createInitialActionRow,
  createUpdatedActionRow,
  globalRaidParticipants,
}
