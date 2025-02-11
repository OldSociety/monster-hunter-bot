const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { Monster } = require('../../../Models/model.js')
const { checkAdvantage } = require('../../Hunt/huntUtils/huntHelpers.js')
const { createHealthBar } = require('../../Hunt/huntUtils/battleHandler.js')
const { displayHuntSummary } = require('../../Hunt/huntUtils/rewardHandler.js')
const { collectors, stopUserCollector } = require('../../../utils/collectors')

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
  const playerHealthBar = createHealthBar(user.current_raidHp, user.score)

  return new EmbedBuilder()
    .setTitle(`${raidBoss.name} - Raid Boss`)
    .setDescription(
      `**Your HP:** ${user.current_raidHp} / ${user.score}  ${playerHealthBar}\n\n` +
        `**CR:** ${raidBoss.hp / 1000}\n` +
        `**Boss HP:** ${raidBoss.hp} / ${raidBoss.maxHP}\n` +
        `**Combat Type:** ${raidBoss.combatType}`
    )
    .setColor('#FF4500')
    .setThumbnail(raidBoss.imageUrl)
    .setFooter({ text: getUserFooter(user) })
}

async function runBattlePhases(
  interaction,
  user,
  playerScore,
  raidBoss,
  advMultiplier,
  huntData
) {
  if (!user.current_raidHp) {
    user.current_raidHp = user.score
    await user.save()
  }

  let playerHP = user.current_raidHp
  let bossHP = raidBoss.hp
  const maxBossHP = raidBoss.maxHP
  const maxPlayerHP = user.score
  const imageUrl = raidBoss.imageUrl

  for (let phase = 1; bossHP > 0 && playerHP > 0; phase++) {
    let playerRoll = Math.round(Math.random() * playerScore * advMultiplier)
    let monsterRoll = Math.round(Math.random() * raidBoss.rollScore) // Using monster.hp as roll power

    let phaseResult = playerRoll >= monsterRoll ? 'Hit!' : 'Miss!'

    if (phaseResult === 'Hit!') {
      bossHP -= playerRoll // Players directly reduce boss HP
    } else {
      playerHP -= monsterRoll // Player takes damage from boss
    }

    if (bossHP <= 0) bossHP = 0
    if (playerHP <= 0) playerHP = 0

    user.current_raidHp = playerHP
    await user.save() // 🛑 Ensure HP is saved after each phase

    const playerHealthBar = createHealthBar(playerHP, maxPlayerHP)
    const bossHealthBar = createHealthBar(bossHP, maxBossHP)

    const phaseEmbed = new EmbedBuilder()
      .setTitle(`Phase ${phase} - Fighting ${raidBoss.name}`)
      .setDescription(
        `**Your HP:** ${playerHP} / ${maxPlayerHP}  ${playerHealthBar}\n` +
          `**Boss HP:** ${bossHP} / ${maxBossHP}  ${bossHealthBar}\n\n` +
          `**Player Roll:** ${playerRoll}\n` +
          `**Boss Roll:** ${monsterRoll}\n\n` +
          `**Phase ${phase} Result:** ${phaseResult}\n`
      )
      .setColor('#FF4500')
      .setImage(imageUrl)
      .setFooter({ text: getUserFooter(user) })

    await interaction.followUp({ embeds: [phaseEmbed], ephemeral: true })

    if (bossHP <= 0) return true // Boss is defeated
    if (playerHP <= 0) return false // Player is defeated

    await new Promise((resolve) => setTimeout(resolve, 3000)) // 🛑 Delay for 3 seconds between phases
  }

  return false
}

async function startRaidEncounter(interaction, user) {
  stopUserCollector(interaction.user.id)

  const raidBosses = await Monster.findAll({
    where: { index: ['ancient-copper-dragon', 'solar', 'lich'] },
  })

  if (!raidBosses || raidBosses.length === 0) {
    return interaction.followUp({
      content: 'Error: No valid raid bosses found.',
      ephemeral: true,
    })
  }

  const selectedBoss = raidBosses[Math.floor(Math.random() * raidBosses.length)]
  const bossStartingHP = Math.max(1, selectedBoss.cr * 1000)

  if (!user.current_raidHp) {
    user.current_raidHp = user.score
    await user.save()
  }

  const raidBoss = {
    name: selectedBoss.name,
    index: selectedBoss.index,
    type: selectedBoss.type,
    combatType: selectedBoss.combatType,
    hp: bossStartingHP,
    maxHP: bossStartingHP,
    rollScore: selectedBoss.hp,
    imageUrl: selectedBoss.imageUrl,
  }

  const huntData = {
    totalGoldEarned: 0,
    ichorUsed: false,
    level: raidBoss,
    lastMonster: raidBoss,
    inProgress: true,
  }

  const monsterEmbed = createRaidBossEmbed(raidBoss, user)
  const styleRow = createStyleButtons(user)
  const healRow = createHealButtons(user)

  await interaction.followUp({
    embeds: [monsterEmbed],
    components: [styleRow, healRow],
    ephemeral: true,
  })

  const filter = (i) => i.user.id === interaction.user.id
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 60000,
  })
  collectors.set(interaction.user.id, collector)

  collector.on('collect', async (i) => {
    if (i.customId === 'heal') {
      await handleHealAction(i, user, raidBoss, 'one')
      return
    }

    if (i.customId === 'heal_max') {
      await handleHealAction(i, user, raidBoss, 'max')
      return
    }

    if (i.customId === 'cancel_raid') {
      await handleCancelRaid(i, user)
      return
    }

    if (huntData.styleInteractionHandled) return
    huntData.styleInteractionHandled = true

    const selectedStyle = i.customId.split('_')[1]
    const playerScore = user[`${selectedStyle}_score`]
    const advMultiplier = checkAdvantage(selectedStyle, raidBoss.combatType)

    await i.deferUpdate()
    const playerWins = await runBattlePhases(
      i,
      user,
      playerScore,
      raidBoss,
      advMultiplier,
      huntData
    )

    if (playerWins) {
      huntData.totalGoldEarned += 0
      await displayHuntSummary(i, user, huntData, true)
    } else {
      await displayHuntSummary(i, user, huntData, false)
    }

    huntData.styleInteractionHandled = false
  })
}

function createHealButtons(user) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('heal')
      .setLabel(`Heal (10 HP per token)`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(user.currency.tokens < 1),
    new ButtonBuilder()
      .setCustomId('heal_max')
      .setLabel(`Heal to Max`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(user.currency.tokens < 1),
    new ButtonBuilder()
      .setCustomId('cancel_raid')
      .setLabel(`Cancel Raid`)
      .setStyle(ButtonStyle.Secondary)
  )
}

async function handleCancelRaid(interaction, user) {
  await interaction.deferUpdate() // Defer the interaction before updating

  // Reset the user's raid HP
  user.current_raidHp = user.score
  await user.save()

  await interaction.message.edit({
    content: 'You have canceled the raid.',
    embeds: [],
    components: [],
  })
}

async function handleHealAction(interaction, user, raidBoss, healType) {
  await interaction.deferUpdate() // Defer the interaction before updating

  if (user.currency.tokens < 1) {
    return interaction.followUp({
      content: "You don't have enough tokens to heal.",
      ephemeral: true,
    })
  }

  let tokensSpent = 0
  if (healType === 'max') {
    // Heal to full, spending as many tokens as needed
    const neededHealing = user.score - user.current_raidHp
    tokensSpent = Math.min(Math.ceil(neededHealing / 10), user.currency.tokens)
    user.current_raidHp = user.score
  } else {
    // Heal 10 HP per token
    user.current_raidHp = Math.min(user.current_raidHp + 10, user.score)
    tokensSpent = 1
  }

  user.currency.tokens -= tokensSpent
  await user.save() // 🛑 Ensure tokens are removed and saved properly

  // Create updated embed with new player health
  const updatedEmbed = createRaidBossEmbed(raidBoss, user)

  try {
    if (interaction.message) {
      await interaction.message.edit({ embeds: [updatedEmbed] })
    } else {
      await interaction.followUp({ embeds: [updatedEmbed], ephemeral: true }) // Send a new message if the original is gone
    }
  } catch (error) {
    console.error(
      '❌ Failed to edit message, sending a new one instead.',
      error
    )
    await interaction.followUp({ embeds: [updatedEmbed], ephemeral: true }) // Send a fallback message
  }
}

function createStyleButtons(user) {
  const styles = ['brute', 'spellsword', 'stealth']
  const styleColors = {
    brute: ButtonStyle.Danger,
    spellsword: ButtonStyle.Primary,
    stealth: ButtonStyle.Success,
  }

  const styleRow = new ActionRowBuilder()
  styles.forEach((style) => {
    if (user[`${style}_score`] > 0) {
      styleRow.addComponents(
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
  return styleRow
}

module.exports = { startRaidEncounter }
