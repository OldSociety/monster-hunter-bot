//raidHelpers.js

const { createHealthBar } = require('../../Hunt/huntUtils/battleHandler.js')
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')

function formatTimeRemaining(ms) {
  let totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  let minutes = Math.floor((totalSeconds % 3600) / 60)
  let seconds = totalSeconds % 60
  // If there's still time left but it's less than a minute, show 1 minute.
  // if (totalSeconds > 0 && minutes === 0) {
  //   minutes = 1
  //   seconds = 0
  // }
  return `${days}d:${hours}h:${minutes}m:${seconds}`
}

function getUserFooter(user) {
  const gold = user.gold || 0
  const currency = user.currency || {}
  const energy = currency.energy || 0
  const tokens = currency.tokens || 0
  const eggs = currency.eggs || 0
  const ichor = currency.ichor || 0
  const gear = currency.gear || 0

  return `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor} ⚙️${gear}`
}

function createWelcomeEmbed(raidBoss, user) {
  const playerHealthBar = createHealthBar(user.current_raidHp, user.score)

  return new EmbedBuilder()
    .setTitle(`Current Boss: ${raidBoss.name} (${raidBoss.hp})`)
    .setDescription(
      "**Welcome to Raids!** Join forces with other hunters to battle the most powerful bosses in the game. You don't have to defeat the boss. The more injured they are at the end of the Raid the better your rewards!\n\n" +
        'Defeat the boss to earn **exclusive loot** and unlock their **legendary card**!\n\n' +
        `**Your HP:** ${user.current_raidHp} / ${user.score}\n${playerHealthBar}\n\n`
    )
    .setColor('#FFD700')
    .setThumbnail(raidBoss.imageUrl)
    .setFooter({ text: getUserFooter(user) })
}

function createRaidBossEmbed(raidBoss, user) {
  console.log('[Embed] Creating Raid Boss Embed for:', raidBoss.name)
  const lootDrops = [raidBoss.loot1, raidBoss.loot2, raidBoss.loot3].filter(
    Boolean
  )
  const rarityEmojis = ['🟢', '🔵', '🟣']

  const formattedLootDrops = lootDrops
    .map((loot, index) => {
      // Replace dashes with spaces and capitalize each word
      const formattedLoot = loot
        .split('-')
        .map((word) => {
          return word.charAt(0).toUpperCase() + word.slice(1)
        })
        .join(' ')
      const emoji = rarityEmojis[index] || ''
      return `${emoji} ${formattedLoot}`
    })
    .join('\n')

  const playerHealthBar = createHealthBar(user.current_raidHp, user.score)
  const bossHealthBar = createHealthBar(raidBoss.current_hp, raidBoss.hp)

  return new EmbedBuilder()
    .setTitle(`${raidBoss.name}`)
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
  console.log(
    '[UI] Creating initial action row with Raid, Heal, and Cancel buttons.'
  )
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
  console.log(
    '[UI] Creating updated action row with style buttons and Heal/Cancel buttons.'
  )
  const styleButtons = []
  const styles = ['brute', 'spellsword', 'stealth']
  const styleColors = {
    brute: ButtonStyle.Danger,
    spellsword: ButtonStyle.Primary,
    stealth: ButtonStyle.Success,
  }

  styles.forEach((style) => {
    if (user[`${style}_score`] > 0) {
      console.log(`[UI] Adding style button for: ${style}`)
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

  // Create Heal and Cancel buttons (same as before)
  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_raid')
    .setLabel('Cancel Raid')
    .setStyle(ButtonStyle.Secondary)

  // Combine all buttons into one row. Maximum 5 buttons per row.
  const updatedRow = new ActionRowBuilder()
  // Add style buttons first.
  styleButtons.forEach((btn) => updatedRow.addComponents(btn))
  // Add Heal and Cancel buttons.
  updatedRow.addComponents(cancelButton)

  console.log(
    '[UI] Updated action row created with',
    updatedRow.components.length,
    'buttons.'
  )
  return updatedRow
}

async function processGlobalRaidRewards(raidBoss) {
  // Calculate overall raid progress based on damage inflicted:
  // If boss.current_hp is 0, progress = 1; otherwise, progress = 1 - (current_hp / full_hp)
  const raidProgressPercentage = 1 - raidBoss.current_hp / raidBoss.hp
  console.log('[Rewards] Raid progress percentage:', raidProgressPercentage)

  // For each user in the global participant list, load their user record and update rewards.
  // (Assume you have a function getUserById or similar; if not, use your ORM method.)
  for (const userId of globalRaidParticipants) {
    // Load user record – adjust the method below according to your ORM.
    const user = await User.findByPk(userId)
    if (!user) continue

    // Calculate uniform rewards for a failed raid (boss not defeated)
    const baseRewards = getUniformBaseRewards(false, raidProgressPercentage)
    const gearReward = getUniformGearReward(false, raidProgressPercentage)
    const cardRewards = getUniformCardRewards(
      false,
      raidProgressPercentage,
      raidBoss
    )

    // Update the user's resources.
    user.gold += baseRewards.gold
    user.currency.gear = (user.currency.gear || 0) + gearReward
    await user.save()

    // Process card rewards – for each card, update the user’s collection.
    for (const cardName of cardRewards) {
      const monster = await fetchMonsterByName(cardName)
      if (monster) {
        await updateOrAddMonsterToCollection(user.user_id, monster)
      }
    }

    // Optionally, you could log or send an individual message to each user.
    console.log(`[Rewards] Processed rewards for user ${userId}`)
  }

  // After processing, you might clear the global participant set so that the next raid starts fresh.
  globalRaidParticipants.clear()

  // Build and return a summary embed that shows the rewards distributed.
  // (Since rewards might differ per user, you could instead show a general message.)
  const summaryEmbed = new EmbedBuilder()
    .setTitle('🏆 Raid Complete.')
    .setDescription(
      `Raid progress was ${Math.round(
        raidProgressPercentage * 100
      )}%. Rewards have been distributed to all participants.`
    )
    .setColor('Green')
  return summaryEmbed
}

module.exports = {
  formatTimeRemaining,
  getUserFooter,
  createWelcomeEmbed,
  createRaidBossEmbed,
  createInitialActionRow,
  createUpdatedActionRow,
  processGlobalRaidRewards,
}
