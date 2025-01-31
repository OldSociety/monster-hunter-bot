// encounterHandler.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const {
  pullSpecificMonster,
  pullMonsterByCR,
} = require('../../../handlers/huntCacheHandler')
const { checkAdvantage } = require('./huntHelpers.js')
const { runBattlePhases } = require('./battleHandler.js')
const { displayHuntSummary } = require('./rewardHandler.js')
const { collectors, stopUserCollector } = require('../../../utils/collectors')
const { huntPages } = require('../huntPages.js')

function selectMonster(huntData, currentBattle) {
  if (huntData.lastMonster && huntData.retries > 0) {
    console.log('Reusing last monster due to retries.')
    return huntData.lastMonster
  }

  const selectedMonster =
    currentBattle.type === 'mini-boss' || currentBattle.type === 'boss'
      ? pullSpecificMonster(currentBattle.monsterIndex)
      : pullMonsterByCR(currentBattle.cr)


  return selectedMonster
}

function calculateMonsterHP(monster, difficulty) {
  const difficultyModifiers = {
    easy: 0.5,
    medium: 1,
    hard: 1.5,
    'very-hard': 2,
    'boss-half': 0.5,
    'boss-full': 1,
    'boss-strong': 1.25,
  }
  const finalHP = Math.max(
    monster.hp * (difficultyModifiers[difficulty] || 1),
    8
  )

  return finalHP
}

function createMonsterEmbed(monster, difficulty, ichorUsed, huntData) {
  const battleNumber = (huntData.currentBattleIndex ?? 0) + 1
  const totalBattles = huntData.level?.battles?.length || 1

  let title = monster.name
  if (difficulty === 'boss') title += ' ``Boss!``'
  if (difficulty === 'mini-boss') title += ' ``Mini-boss``'
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
  console.log(`Creating style buttons for user: ${user.id}`)

  const styles = ['brute', 'spellsword', 'stealth']
  const styleColors = {
    brute: ButtonStyle.Danger,
    spellsword: ButtonStyle.Primary,
    stealth: ButtonStyle.Success,
  }

  const styleRow = new ActionRowBuilder()
  styles.forEach((style) => {
    if (user[`${style}_score`] > 0) {
      console.log(`Adding button for style: ${style}`)
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
  // Prevent retry if out of energy
  if (user.currency.energy < huntData.level.energyCost) {
    const noEnergyRetryEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Out of Energy')
      .setDescription(
        `You don't have enough energy to retry. Each retry costs ⚡${huntData.level.energyCost} energy.\nEnergy regenerates every 10 minutes.`
      )
      .setFooter({
        text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🧪${user.currency.ichor}`,
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
      `You were defeated by the ${huntData.lastMonster.name}. Would you like to try again?\n` +
        `You have ${3 - huntData.retries} revives left.`
    )
    .setColor('#FF0000')
    .setFooter({
      text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🧪${user.currency.ichor}`,
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

  collector.on('end', async (collected, reason) => {
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
  console.log(`startNewEncounter() called for: ${interaction.user.tag}`)

  stopUserCollector(interaction.user.id)

  if (!huntData.level || !huntData.level.page) {
    console.error(
      `❌ ERROR: huntData.level or huntData.level.page is undefined.`
    )
    return interaction.followUp({
      content: 'Error: Invalid hunt data.',
      ephemeral: true,
    })
  }

  const pageKey = huntData.level.page
  const huntId = huntData.level.id

  if (!huntPages[pageKey]) {
    console.error(`❌ ERROR: huntPages[${pageKey}] is undefined!`)
    return interaction.followUp({
      content: `Error: Invalid hunt page (${pageKey}).`,
      ephemeral: true,
    })
  }

  const currentHunt = huntPages[pageKey].hunts.find(
    (hunt) => hunt.key === huntData.level.key
  )

  if (!currentHunt) {
    console.error(`❌ ERROR: Hunt ${huntId} not found in ${pageKey}!`)
    return interaction.followUp({
      content: `Error: Hunt not found.`,
      ephemeral: true,
    })
  }

  const currentBattle = currentHunt.battles[huntData.currentBattleIndex]
  console.log(`Current battle: ${currentBattle ? currentBattle.type : 'None'}`)

  const monster = selectMonster(huntData, currentBattle)
  if (!monster) {
    console.error('No monsters available for this encounter.')
    return interaction.followUp({
      content: 'No monsters available.',
      ephemeral: true,
    })
  }

  huntData.lastMonster = monster
  const monsterScore = calculateMonsterHP(monster, currentBattle.difficulty)
  const monsterEmbed = createMonsterEmbed(
    monster,
    currentBattle.type,
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
 // Prevent duplicate interactions
    if (huntData.styleInteractionHandled) {
      console.warn('⚠️ Duplicate interaction detected. Ignoring.')
      return
    }
    huntData.styleInteractionHandled = true // Mark as handled

    try {
      if (!styleInteraction.replied && !styleInteraction.deferred) {
        await styleInteraction.deferUpdate()
      }
      // Acknowledge immediately to prevent expiration
      if (styleInteraction.replied || styleInteraction.deferred) {
        console.warn(
          `⚠️ Interaction ${styleInteraction.id} was already acknowledged.`
        )
      } else {
        await styleInteraction
          .deferUpdate()
          .catch((err) => console.warn('⚠️ deferUpdate failed:', err))
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
        huntData.totalMonstersDefeated += 1
        huntData.totalGoldEarned += currentBattle.goldReward || 0
        huntData.currentBattleIndex += 1
        huntData.retries = 0
        huntData.lastMonster = null

        if (huntData.currentBattleIndex >= huntData.level.battles.length) {
          await displayHuntSummary(styleInteraction, user, huntData, true)
        } else {
          huntData.styleInteractionHandled = false // Reset flag for next battle
          await startNewEncounter(styleInteraction, user, huntData)
        }
      } else {
        huntData.retries += 1
        if (huntData.retries < 3) {
          huntData.styleInteractionHandled = false // Reset flag for retry
          await offerRetry(styleInteraction, user, huntData)
        } else {
          console.log('💀 Player failed too many times. Ending hunt.')
          await displayHuntSummary(styleInteraction, user, huntData, false)
        }
      }
    } catch (error) {
      if (error.code === 10062) {
        console.error(
          '⚠️ DiscordAPIError[10062]: Interaction expired before handling.'
        )
      } else {
        console.error('Error processing interaction:', error)
      }
    }
  })

  styleCollector.on('end', async (_, reason) => {
    console.log(`Style collector ended. Reason: ${reason}`)

    if (reason === 'time') {
      console.warn('⏳ Style selection timed out.')
      try {
        await interaction.editReply({
          content: 'Session expired. Please start again.',
          components: [],
          ephemeral: true,
        })
      } catch (error) {
        console.error('⚠️ Error sending timeout message:', error)
      }
    }
  })
}

module.exports = {
  startNewEncounter,
}
