const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { pullSpecificMonster } = require('../../../handlers/cacheHandler')
const { checkAdvantage } = require('./huntHelpers.js')
const { runBattlePhases } = require('./battleHandler.js')
const { displayHuntSummary } = require('./rewardHandler.js')
const { collectors, stopUserCollector } = require('../../../utils/collectors')
const { huntPages } = require('../huntPages.js')

function selectMonster(huntData, currentBattle) {
  const selectedMonster = pullSpecificMonster(currentBattle.monsterIndex)
  if (!selectedMonster) {
    console.error(`Error: Monster '${currentBattle.monsterIndex}' not found.`)
    return null
  }
  return selectedMonster
}

function calculateMonsterHP(monster, difficulty) {
  const hpValue = Number(difficulty) || 1 // Ensure it's a number, fallback to 8 if invalid
  return Math.max(hpValue, 1)
}


function createMonsterEmbed(monster, difficulty, ichorUsed, huntData) {
  const battleNumber = (huntData.currentBattleIndex ?? 0) + 1
  const totalBattles = huntData.level?.battles?.length || 1
  let title = monster.name
  if (difficulty === 'boss') title += ' Boss!'
  if (difficulty === 'mini-boss') title += ' Mini-boss'
  title += ` - ${battleNumber}/${totalBattles}`

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      `**CR:** ${monster.cr ?? 'Unknown'}\n**Type:** ${
        monster.type ?? 'Unknown'
      }`
    )
    .setColor('#FFA500')
    .setThumbnail(
      `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${monster.index}.jpg`
    )

  if (ichorUsed) {
    embed.addFields({
      name: 'Ichor Invigoration',
      value: 'You are invigorated with 🧪ichor! Your strength increases.',
    })
  }
  return embed
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

async function offerRetry(interaction, user, huntData) {
  if (user.currency.energy < huntData.level.energyCost) {
    const noEnergyRetryEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Out of Energy')
      .setDescription(
        `You don't have enough energy to retry. Each retry costs ⚡${huntData.level.energyCost} energy.\nEnergy regenerates every 10 minutes.`
      )
      .setFooter({
        text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
      })
    await interaction.followUp({
      embeds: [noEnergyRetryEmbed],
      ephemeral: true,
    })
    await displayHuntSummary(interaction, user, huntData, false)
    return
  }

  const retryEmbed = new EmbedBuilder()
    .setTitle('You have been defeated!')
    .setDescription(
      `You were defeated by the ${
        huntData.lastMonster.name
      }. Would you like to try again?\nYou have ${
        3 - huntData.retries
      } revives left.`
    )
    .setColor('#FF0000')
    .setFooter({
      text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
    })

  const retryButton = new ButtonBuilder()
    .setCustomId('retry_hunt')
    .setLabel(`Retry ⚡${huntData.level.energyCost}`)
    .setStyle(ButtonStyle.Success)
  const endHuntButton = new ButtonBuilder()
    .setCustomId('end_hunt')
    .setLabel('End Hunt')
    .setStyle(ButtonStyle.Danger)

  const actionRow = new ActionRowBuilder().addComponents(
    retryButton,
    endHuntButton
  )

  await interaction.followUp({
    embeds: [retryEmbed],
    components: [actionRow],
    ephemeral: true,
  })

  const filter = (i) => i.user.id === interaction.user.id
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    max: 1,
    time: 15000,
  })

  collector.on('collect', async (i) => {
    await i.deferUpdate()
    if (i.customId === 'retry_hunt') {
      if (user.currency.energy < huntData.level.energyCost) {
        const noEnergyRetryEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('Out of Energy')
          .setDescription(
            `You don't have enough energy to retry. Each retry costs ⚡${huntData.level.energyCost} energy.\nEnergy regenerates every 10 minutes.`
          )
        await interaction.followUp({
          embeds: [noEnergyRetryEmbed],
          ephemeral: true,
        })
        await displayHuntSummary(interaction, user, huntData, false)
        collector.stop()
        return
      }
      user.currency.energy -= huntData.level.energyCost
      user.changed('currency', true)
      await user.save()
      await startNewEncounter(interaction, user, huntData)
    } else if (i.customId === 'end_hunt') {
      await displayHuntSummary(interaction, user, huntData, false)
    }
    collector.stop()
  })

  collector.on('end', async (_, reason) => {
    if (reason === 'time') {
      await interaction.followUp({
        content:
          'Session expired. You did not choose to retry or end the hunt in time.',
        ephemeral: true,
      })
      await displayHuntSummary(interaction, user, huntData, false)
    }
  })
}

async function startNewEncounter(interaction, user, huntData) {
  stopUserCollector(interaction.user.id)

  if (!huntData.level || !huntData.level.page) {
    return interaction.followUp({
      content: 'Error: Invalid hunt data.',
      ephemeral: true,
    })
  }

  const pageKey = huntData.level.page
  if (!huntPages[pageKey]) {
    return interaction.followUp({
      content: `Error: Invalid hunt page (${pageKey}).`,
      ephemeral: true,
    })
  }

  const currentHunt = huntPages[pageKey].hunts.find(
    (hunt) => hunt.key === huntData.level.key
  )
  if (!currentHunt) {
    return interaction.followUp({
      content: 'Error: Hunt not found.',
      ephemeral: true,
    })
  }

  const currentBattle = currentHunt.battles[huntData.currentBattleIndex]
  if (!currentBattle) {
    return interaction.followUp({
      content: 'Error: No battle data available.',
      ephemeral: true,
    })
  }
  if (!currentBattle.monsterIndex) {
    return interaction.followUp({
      content: 'Error: No valid monster assigned to this battle.',
      ephemeral: true,
    })
  }

  const monster = selectMonster(huntData, currentBattle)
  if (!monster) {
    return interaction.followUp({
      content: 'Error: No monster available for battle.',
      ephemeral: true,
    })
  }

  huntData.lastMonster = monster
  const monsterScore = calculateMonsterHP(monster, currentBattle.difficulty)
  const monsterEmbed = createMonsterEmbed(
    monster,
    currentBattle.difficulty,
    huntData.ichorUsed,
    huntData
  )
  const styleRow = createStyleButtons(user)

  await interaction.followUp({
    embeds: [monsterEmbed],
    components: [styleRow],
    ephemeral: true,
  })

  if (huntData.styleCollector) {
    huntData.styleCollector.stop()
  }

  const filter = (i) => i.user.id === interaction.user.id
  const styleCollector = interaction.channel.createMessageComponentCollector({
    filter,
    max: 1,
    time: 60000,
  })
  huntData.styleCollector = styleCollector
  collectors.set(interaction.user.id, styleCollector)

  styleCollector.on('collect', async (styleInteraction) => {
    if (huntData.styleInteractionHandled) return
    huntData.styleInteractionHandled = true

    try {
      if (!styleInteraction.replied && !styleInteraction.deferred) {
        await styleInteraction.deferUpdate()
      }
      const selectedStyle = styleInteraction.customId.split('_')[1]
      const playerScore = user[`${selectedStyle}_score`]
      const advMultiplier = checkAdvantage(selectedStyle, monster.type)

      await styleInteraction.editReply({
        embeds: [monsterEmbed],
        components: [],
      })
      const playerWins = await runBattlePhases(
        styleInteraction,
        user,
        playerScore,
        monsterScore,
        monster,
        advMultiplier,
        huntData,
        currentBattle.type
      )

      if (playerWins) {
        huntData.totalMonstersDefeated++
        huntData.totalGoldEarned += currentBattle.goldReward || 0
        huntData.currentBattleIndex++
        huntData.retries = 0
        huntData.lastMonster = null
        if (huntData.currentBattleIndex >= huntData.level.battles.length) {
          await displayHuntSummary(styleInteraction, user, huntData, true)
        } else {
          huntData.styleInteractionHandled = false
          await startNewEncounter(styleInteraction, user, huntData)
        }
      } else {
        huntData.retries++
        if (huntData.retries < 3) {
          huntData.styleInteractionHandled = false
          await offerRetry(styleInteraction, user, huntData)
        } else {
          await displayHuntSummary(styleInteraction, user, huntData, false)
        }
      }
    } catch (error) {
      if (error.code === 10062) {
        console.error('Interaction expired before handling.')
      } else {
        console.error('Error processing interaction:', error)
      }
    }
  })

  styleCollector.on('end', async (_, reason) => {
    if (reason === 'time') {
      try {
        await interaction.editReply({
          content: 'Session expired. Please start again.',
          components: [],
          ephemeral: true,
        })
      } catch (error) {
        console.error('Error sending timeout message:', error)
      }
    }
  })
}

module.exports = {
  startNewEncounter,
}
