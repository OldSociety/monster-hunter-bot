const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const {
  checkAdvantage,
  calculateWinChance,
} = require('../../Hunt/huntUtils/huntHelpers.js')
const { createHealthBar } = require('../../Hunt/huntUtils/battleHandler.js')
const { collectors, stopUserCollector } = require('../../../utils/collectors')
const { RaidBoss } = require('../../../Models/model.js')
const { raidBossRotation } = require('../../../handlers/raidTimerHandler.js')

const cooldownDuration = 300000 // e.g., 1-minute cooldown
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

// ... Continue with active raid handling if not in cooldown.

function getUserFooter(user) {
  const gold = user.gold || 0
  const currency = user.currency || {}
  const energy = currency.energy || 0
  const tokens = currency.tokens || 0
  const eggs = currency.eggs || 0
  const ichor = currency.ichor || 0
  return `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor}`
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
    .setTitle(`${raidBoss.name} [RAID BOSS]`)
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

async function runBattlePhases(
  interaction,
  user,
  playerScore,
  raidBoss,
  advMultiplier,
  selectedStyle
) {
  console.log('[Battle] Starting Battle Phases')
  let playerHP = user.current_raidHp
  let bossHP = raidBoss.current_hp
  const maxBossHP = raidBoss.hp
  const maxPlayerHP = user.score
  const imageUrl = raidBoss.imageUrl

  let phase = 0
  while (bossHP > 0 && playerHP > 0) {
    phase++
    console.log(`[Battle] Phase ${phase} started.`)

    // Use a random multiplier between 0.1 and 1 for the player's roll.
    let multiplier = Math.random() * 0.9 + 0.1
    let playerRoll = Math.round(multiplier * playerScore * advMultiplier)

    // Monster roll with a floor at 50% of boss_score.
    let monsterRoll = Math.round(
      Math.random() * (raidBoss.boss_score * 0.5) + raidBoss.boss_score * 0.5
    )
    console.log(
      `[Battle] Phase ${phase} rolls - Player: ${playerRoll}, Monster: ${monsterRoll}`
    )

    let phaseResult = playerRoll >= monsterRoll ? 'Hit!' : 'Miss!'
    console.log(`[Battle] Phase ${phase} result: ${phaseResult}`)

    if (phaseResult === 'Hit!') {
      let damage = Math.round(playerRoll * 0.1)
      bossHP -= damage
      console.log(`[Battle] Phase ${phase} - Boss HP reduced by ${damage}`)
    } else {
      let damage = Math.round(monsterRoll * 0.1)
      playerHP -= damage
      console.log(`[Battle] Phase ${phase} - Player HP reduced by ${damage}`)
    }

    if (bossHP < 0) bossHP = 0
    if (playerHP < 0) playerHP = 0

    const isAdvantaged = advMultiplier > 1
    const isDisadvantaged = advMultiplier < 1
    const effects =
      [
        isAdvantaged ? '⏫Advantage' : '',
        isDisadvantaged ? '⏬Disadvantage' : '',
      ]
        .filter(Boolean)
        .join(', ') || 'None'

    const playerHealthBar = createHealthBar(playerHP, maxPlayerHP)
    const bossHealthBar = createHealthBar(bossHP, maxBossHP)

    const phaseEmbed = new EmbedBuilder()
      .setTitle(`Phase ${phase} - Fighting ${raidBoss.name}`)
      .setDescription(
        `**Your HP:** ${playerHP} / ${maxPlayerHP}\n${playerHealthBar}\n` +
          `**Boss HP:** ${bossHP} / ${maxBossHP}\n${bossHealthBar}\n\n` +
          `**Effects:** ${effects}\n` +
          `**Player Roll:** ${playerRoll}\n` +
          `**Boss Roll:** ${monsterRoll}\n\n` +
          `**Phase ${phase} Result:** ${phaseResult}\n` +
          (selectedStyle ? `**Style:** ${selectedStyle}\n` : '')
      )
      .setColor('#FF4500')
      .setImage(imageUrl)
      .setFooter({ text: getUserFooter(user) })

    console.log(`[Battle] Phase ${phase} - Sending phase embed.`)
    await interaction.followUp({ embeds: [phaseEmbed], ephemeral: true })

    if (bossHP <= 0 || playerHP <= 0) break
    console.log(
      `[Battle] Phase ${phase} complete. Waiting 3 seconds for next phase.`
    )
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  console.log(
    `[Battle] Battle ended. Final Player HP: ${playerHP}, Final Boss HP: ${bossHP}`
  )
  // Write the final damage values to the database at the end of the battle.
  user.current_raidHp = playerHP
  await user.save()
  if (raidBoss.instance) {
    raidBoss.instance.current_hp = bossHP
    await raidBoss.instance.save()
    console.log('[Battle] Raid boss current_hp updated in database.')
  } else {
    console.log('[Battle] No raid boss instance available for database update.')
  }

  // Return true if the boss was defeated.
  return bossHP <= 0
}

async function startRaidEncounter(interaction, user) {
  console.log('[Raid] Starting raid encounter')
  stopUserCollector(interaction.user.id)
  const now = Date.now()

  const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
  console.log(`[Raid] Retrieved ${raidBosses.length} raid bosses.`)
  if (!raidBosses || raidBosses.length === 0) {
    console.log('[Raid] No valid raid bosses found.')
    return interaction.followUp({
      content: 'Error: No valid raid bosses found.',
      ephemeral: true,
    })
  }

  const selectedBoss = raidBosses[raidBossRotation.currentIndex]
  console.log('[Raid] Selected raid boss:', selectedBoss.name)

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
    boss_score: selectedBoss.boss_score, // Make sure this field is correct
    imageUrl: selectedBoss.imageUrl,
    lootDrops: selectedBoss.lootDrops || [],
    activePhase: raidBossRotation.phase === 'active',
    instance: selectedBoss, // Attach the model instance here
  }

  if (!raidBoss.activePhase) {
    const elapsed = now - raidBossRotation.lastSwitch
    const timeRemaining = Math.max(0, cooldownDuration - elapsed);


    // Option A: Using custom formatted string:
    const embed = new EmbedBuilder()
      .setTitle('🔒 Raids are on Cooldown')
      .setDescription(
        `Raids will restart in ${formatTimeRemaining(timeRemaining)}.`
      )
      .setColor('Gold')

    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ embeds: [embed], ephemeral: true })
    } else {
      return interaction.reply({ embeds: [embed], ephemeral: true })
    }
  }

  const monsterEmbed = createRaidBossEmbed(raidBoss, user)
  console.log('[Raid] Overview embed created.')

  // Use the initial action row: Raid, Heal, Cancel.
  const initialRow = createInitialActionRow(user)
  console.log('[Raid] Initial action row created.')

  await interaction.followUp({
    embeds: [monsterEmbed],
    components: [initialRow],
    ephemeral: true,
  })
  console.log('[Raid] Sent overview embed with initial action row.')

  const filter = (i) => i.user.id === interaction.user.id
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 60000,
  })
  collectors.set(interaction.user.id, collector)
  console.log('[Raid] Collector set up for button interactions.')

  collector.on('collect', async (i) => {
    console.log('[Collector] Button pressed:', i.customId)
    if (i.customId === 'initiate_raid') {
      console.log(
        '[Collector] Raid button clicked - updating message with style buttons and retaining Heal/Cancel buttons.'
      )
      const updatedRow = createUpdatedActionRow(user)
      const updatedEmbed = createRaidBossEmbed(raidBoss, user)
      await i.update({
        embeds: [updatedEmbed],
        components: [updatedRow],
      })
      console.log('[Collector] Message updated with new action row.')
      return
    }

    if (i.customId === 'heal') {
      console.log('[Collector] Heal button clicked.')
      await handleHealAction(i, user, raidBoss, 'one')
      return
    }

    if (i.customId === 'cancel_raid') {
      console.log('[Collector] Cancel raid button clicked.')
      await handleCancelRaid(i, user)
      return
    }

    if (i.customId.startsWith('style_')) {
      const selectedStyle = i.customId.split('_')[1]
      console.log('[Collector] Style selected:', selectedStyle)
      const playerScore = user[`${selectedStyle}_score`]
      const advMultiplier = checkAdvantage(selectedStyle, raidBoss.combatType)
      await i.deferUpdate()
      console.log('[Collector] Starting battle phases.')
      const playerWins = await runBattlePhases(
        i,
        user,
        playerScore,
        raidBoss,
        advMultiplier,
        selectedStyle
      )
      console.log(
        '[Collector] Battle phases complete. Outcome:',
        playerWins ? 'Victory' : 'Defeat'
      )
      if (playerWins) {
        await i.followUp({
          content: '🎉 You have defeated the raid boss!',
          ephemeral: true,
        })
      } else {
        await i.followUp({
          content: '💀 You have been defeated by the raid boss!',
          ephemeral: true,
        })
      }
      // Wait a few seconds then delete the original reply to prevent double clicking.
      setTimeout(async () => {
        try {
          await i.deleteReply()
          console.log('[Outcome] Raid message deleted after battle.')
        } catch (error) {
          console.error('[Outcome] Error deleting raid message:', error)
        }
      }, 3000)
    }
  })
}

async function handleCancelRaid(interaction, user) {
  console.log('[Cancel] Handling raid cancellation.')
  try {
    // Use update() to immediately update the message for a component interaction.
    await interaction.update({
      content: 'You have canceled the raid.',
      embeds: [],
      components: [],
    })
    console.log('[Cancel] Raid cancelled and message updated.')
    // Optionally, delete the reply after a short delay.
    setTimeout(async () => {
      try {
        await interaction.deleteReply()
        console.log('[Cancel] Raid message deleted.')
      } catch (error) {
        console.error('[Cancel] Error deleting raid message:', error)
      }
    }, 3000)
  } catch (error) {
    console.error('[Cancel] Failed to update message on cancel:', error)
    try {
      await interaction.followUp({
        content: 'You have canceled the raid.',
        ephemeral: true,
      })
    } catch (err) {
      console.error('[Cancel] Failed to follow up on cancel:', err)
    }
  }
}

async function handleHealAction(interaction, user, raidBoss, healType) {
  console.log(`[Heal] Handling heal action: ${healType}`)
  await interaction.deferUpdate()

  if (user.currency.tokens < 1) {
    console.log('[Heal] Insufficient tokens to heal.')
    return interaction.followUp({
      content: "You don't have enough tokens to heal.",

      ephemeral: true,
    })
  }

  let tokensSpent = 0
  const missingHP = user.score - user.current_raidHp

  if (missingHP <= 0) {
    console.log('[Heal] Already at max health. No tokens spent.')
    // Optionally, you can return early here if no healing is needed.
  } else if (healType === 'max') {
    // Calculate tokens based on missing HP (10 HP per token).
    tokensSpent = Math.min(Math.ceil(missingHP / 10), user.currency.tokens)
    user.current_raidHp = user.score
    console.log(
      `[Heal] Healing to max. Healing ${missingHP} HP. Tokens spent: ${tokensSpent}`
    )
  } else {
    // For non-max heal, define a fixed heal amount, but don't exceed max HP.
    const desiredHeal = 100
    const healingAmount = Math.min(desiredHeal, missingHP)
    tokensSpent = Math.ceil(healingAmount / 10)
    user.current_raidHp += healingAmount
    console.log(
      `[Heal] Healing by ${healingAmount} HP. Tokens spent: ${tokensSpent}`
    )
  }

  // Subtract only the tokens needed.
  user.currency = {
    ...user.currency,
    tokens: user.currency.tokens - tokensSpent,
  }
  await user.save()
  const updatedEmbed = createRaidBossEmbed(raidBoss, user)
  console.log('[Heal] Updated embed after healing created.')

  try {
    try {
      await interaction.editReply({ embeds: [updatedEmbed] })
    } catch (error) {
      console.error(
        '[Heal] Failed to edit ephemeral message, sending a new one instead.',
        error
      )
      await interaction.followUp({ embeds: [updatedEmbed], ephemeral: true })
    }
  } catch (error) {
    console.error(
      '[Heal] Failed to edit message, sending a new one instead.',
      error
    )
    await interaction.followUp({ embeds: [updatedEmbed], ephemeral: true })
  }
}

module.exports = { startRaidEncounter }
