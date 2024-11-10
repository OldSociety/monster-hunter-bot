// hunt.js

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { Collection } = require('../../Models/model.js')

const { checkUserAccount } = require('../Account/checkAccount.js')
const {
  cacheHuntMonsters,
  pullMonsterByCR,
  pullSpecificMonster,
} = require('../../handlers/huntCacheHandler')
const {
  calculateReward,
  addGoldToUser,
} = require('../../handlers/rewardHandler')
const {
  checkAdvantage,
  energyCostToEmoji,
} = require('../../utils/huntUtility/huntUtils.js')
const { levelData } = require('./Levels/huntLevels.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription(
      'Embark on a hunt and engage in combat with a series of monsters'
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    const userId = interaction.user.id

    const user = await checkUserAccount(interaction)
    if (!user) return

    // Check if the user has an empty collection
    let userCollection
    try {
      userCollection = await Collection.findOne({ where: { userId: userId } })
      if (!userCollection) {
        const noMonstersEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('No Monsters Found')
          .setDescription(
            `You currently do not have any monsters in your collection. You need at least one card to go on a hunt.\n\nUse ` +
              '``' +
              `/shop` +
              '``' +
              `to recieve a starter pack.`
          )
          .setFooter({
            text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.gems} 🧪${user.currency.ichor}`,
          })

        await interaction.editReply({ embeds: [noMonstersEmbed] })
        return
      }
    } catch (error) {
      console.error('Error querying Collection model:', error)
      return interaction.reply({
        content: 'An error occurred while accessing the collection data.',
        ephemeral: true,
      })
    }

    user.currency = user.currency || {}
    user.currency.energy =
      user.currency.energy !== undefined ? user.currency.energy : 10
    user.currency.ichor = user.currency.ichor || 0
    user.maxCompletedLevel = user.maxCompletedLevel || 0

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xffcc00)
      .setDescription('Loading hunt data, please wait...')
    await interaction.editReply({ embeds: [loadingEmbed] })

    await cacheHuntMonsters()

    // Initialize huntData
    let huntData = {
      totalMonstersDefeated: 0,
      totalGoldEarned: 0,
      currentBattleIndex: 0,
      ichorUsed: false,
      level: null,
      retries: 0,
      lastMonster: null,
      inProgress: false,
    }

    await showLevelSelection(interaction, user, huntData)
  },
}

async function showLevelSelection(interaction, user, huntData) {
  const levels = Object.keys(levelData)

  // Check if user has enough energy
  if ((user.currency.energy || 0) < 1) {
    const noEnergyEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('Insufficient Energy')
      .setDescription(
        'You do not have enough energy to start a hunt. Energy regenerates every 10 minutes.'
      )
      .setFooter({
        text: `Available: ⚡${user.currency.energy} 🧪${user.currency.ichor}`,
      })

    await interaction.editReply({
      embeds: [noEnergyEmbed],
      components: [],
      ephemeral: true,
    })
    return
  }

  // Filter levels based on user's maxCompletedLevel
  user.maxCompletedLevel = user.maxCompletedLevel || 0

  const availableLevels = levels.filter((levelKey) => {
    const levelNumber = parseInt(levelKey.replace('hunt', ''))
    return levelNumber <= user.maxCompletedLevel + 1
  })

  if (availableLevels.length === 0) {
    await interaction.editReply({
      content: 'No levels are available. Please complete previous hunts first.',
      ephemeral: true,
    })
    return
  }

  const levelButtons = availableLevels.map((levelKey) => {
    const level = levelData[levelKey]
    const energyEmoji = energyCostToEmoji(level.energyCost) // Convert energy cost to emojis
    return new ButtonBuilder()
      .setCustomId(`level_${levelKey}`)
      .setLabel(`[ ${level.name} ] ${energyEmoji}`) // Use the emoji string here
      .setStyle(ButtonStyle.Primary)
  })

  // Add the ichor option if the user has enough ichor
  const actionRowComponents = [...levelButtons]
  if ((user.currency.ichor || 0) >= 1) {
    const ichorButton = new ButtonBuilder()
      .setCustomId('use_ichor')
      .setLabel('Drink 🧪ichor')
      .setStyle(ButtonStyle.Success)
    actionRowComponents.push(ichorButton)
  }

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_hunt')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Danger)

  actionRowComponents.push(cancelButton)

  const actionRow = new ActionRowBuilder().addComponents(...actionRowComponents)

  const startHuntEmbed = new EmbedBuilder()
    .setTitle('Select a Hunt Level')
    .setDescription(
      'Choose a level to begin your hunt.⚡Cost is display.\n Drinking 🧪ichor before your hunt increases your chances.\n'
    )
    .setColor('#FF0000')
    .setFooter({
      text: `Available: ⚡${user.currency.energy} 🧪${user.currency.ichor}`,
    })

  if (huntData.ichorUsed) {
    startHuntEmbed.addFields({
      name: 'Ichor Invigoration',
      value: 'You are invigorated with 🧪ichor! Your strength increases.',
    })
  }

  await interaction.editReply({
    embeds: [startHuntEmbed],
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
    if (i.customId === 'cancel_hunt') {
      await i.update({
        content: 'Hunt cancelled.',
        embeds: [],
        components: [],
        ephemeral: true,
      })
      collector.stop()
      return
    }
    if (i.customId === 'use_ichor') {
      await i.deferUpdate()

      if ((user.currency.ichor || 0) < 1) {
        await interaction.followUp({
          content: "You don't have enough 🧪ichor to use this option.",
          ephemeral: true,
        })
        return
      }
      user.currency.ichor -= 1
      user.changed('currency', true) // Notify Sequelize of the change
      await user.save()
      huntData.ichorUsed = true

      // Show the level selection again with ichor effect noted
      await showLevelSelection(interaction, user, huntData)
    } else if (i.customId.startsWith('level_')) {
      await i.deferUpdate()
      collector.stop()

      const selectedLevelKey = i.customId.replace('level_', '')
      const selectedLevel = levelData[selectedLevelKey]

      if (user.currency.energy < selectedLevel.energyCost) {
        await interaction.followUp({
          content: `You don't have enough energy to start ${selectedLevel.name}. It costs ⚡${selectedLevel.energyCost} energy.`,
          ephemeral: true,
        })
        return
      }

      user.currency.energy -= selectedLevel.energyCost
      user.changed('currency', true) // Notify Sequelize of the change
      await user.save()

      huntData.level = selectedLevel
      huntData.inProgress = true

      await startNewEncounter(interaction, user, huntData)
    }
  })

  collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      await interaction.editReply({
        content: 'Session expired. Please start again.',
        components: [],
        ephemeral: true,
      })
    }
  })
}

async function startNewEncounter(interaction, user, huntData) {
  const currentBattle = huntData.level.battles[huntData.currentBattleIndex]

  let monster

  if (huntData.lastMonster && huntData.retries > 0) {
    // Use the last monster if player is retrying
    monster = huntData.lastMonster
  } else {
    const battleType = currentBattle.type

    if (battleType === 'mini-boss' || battleType === 'boss') {
      monster = pullSpecificMonster(currentBattle.monsterIndex)
    } else {
      const crKey = currentBattle.cr
      monster = pullMonsterByCR(crKey)
    }

    if (!monster) {
      await interaction.followUp({
        content: 'No monsters available for the current challenge rating.',
        ephemeral: true,
      })
      return
    }

    // Store the monster for potential retries
    huntData.lastMonster = monster
  }

  const imageUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${monster.index}.jpg`
  let monsterScore = monster.hp / 2
  monsterScore = Math.max(monsterScore, 8)

  const monsterEmbed = new EmbedBuilder()
    .setTitle(`A wild ${monster.name} appears!`)
    .setDescription(`**CR:** ${monster.cr}\n**Type:** ${monster.type}`)
    .setColor('#FFA500')
    .setThumbnail(imageUrl)

  if (huntData.ichorUsed) {
    monsterEmbed.addFields({
      name: 'Ichor Invigoration',
      value: 'You are invigorated with 🧪ichor! Your strength increases.',
    })
  }

  const styleRow = new ActionRowBuilder()
  if (user.brute_score > 0) {
    styleRow.addComponents(
      new ButtonBuilder()
        .setCustomId('style_brute')
        .setLabel(`Brute: ${user.brute_score}`)
        .setStyle(ButtonStyle.Primary)
    )
  }
  if (user.spellsword_score > 0) {
    styleRow.addComponents(
      new ButtonBuilder()
        .setCustomId('style_spellsword')
        .setLabel(`Spellsword: ${user.spellsword_score}`)
        .setStyle(ButtonStyle.Secondary)
    )
  }
  if (user.stealth_score > 0) {
    styleRow.addComponents(
      new ButtonBuilder()
        .setCustomId('style_stealth')
        .setLabel(`stealth: ${user.stealth_score}`)
        .setStyle(ButtonStyle.Success)
    )
  }

  await interaction.followUp({
    embeds: [monsterEmbed],
    components: [styleRow],
    ephemeral: true,
  })

  const filter = (i) => i.user.id === interaction.user.id
  const styleCollector = interaction.channel.createMessageComponentCollector({
    filter,
    max: 1,
    time: 15000,
  })

  styleCollector.on('collect', async (styleInteraction) => {
    await styleInteraction.deferUpdate()
    const selectedStyle = styleInteraction.customId.split('_')[1]
    const playerScore = user[`${selectedStyle}_score`]
    const isAdvantaged = checkAdvantage(selectedStyle, monster.type)

    const playerWins = await runBattlePhases(
      interaction,
      playerScore,
      monsterScore,
      monster,
      isAdvantaged,
      huntData,
      currentBattle.type // pass battleType
    )

    if (playerWins) {
      const goldReward = calculateReward(Math.floor(monster.cr))
      await addGoldToUser(user, goldReward)

      huntData.totalGoldEarned += goldReward
      huntData.totalMonstersDefeated += 1
      huntData.currentBattleIndex += 1

      huntData.retries = 0
      huntData.lastMonster = null

      if (huntData.currentBattleIndex >= huntData.level.battles.length) {
        await displayHuntSummary(interaction, user, huntData, true)
      } else {
        await startNewEncounter(interaction, user, huntData)
      }
    } else {
      huntData.retries += 1
      if (huntData.retries < 3) {
        await offerRetry(interaction, user, huntData)
      } else {
        await displayHuntSummary(interaction, user, huntData, false)
      }
    }
  })

  styleCollector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      await interaction.followUp({
        content:
          'Session expired. You did not select a fighting style in time. Please use /hunt to try again.',
        ephemeral: true,
      })
    }
  })
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

async function displayHuntSummary(interaction, user, huntData, levelCompleted) {
  const summaryEmbed = new EmbedBuilder()
    .setTitle('Hunt Summary')
    .setDescription(
      `**Total Monsters Defeated:** ${huntData.totalMonstersDefeated}\n` +
        `**Total Gold Earned:** 🪙${huntData.totalGoldEarned}`
    )
    .setColor('#FFD700')

  if (levelCompleted) {
    summaryEmbed.addFields({
      name: 'Level Completed!',
      value: `Congratulations! You have completed ${huntData.level.name}.`,
    })

    user.maxCompletedLevel = user.maxCompletedLevel || 0
    const levelNumber = parseInt(huntData.level.key.replace('hunt', ''))
    if (user.maxCompletedLevel < levelNumber) {
      user.maxCompletedLevel = levelNumber
      await user.save()
    }
  } else {
    summaryEmbed.addFields({
      name: 'Hunt Ended',
      value: 'Better luck next time!',
    })
  }

  await interaction.followUp({ embeds: [summaryEmbed], ephemeral: false })
}

function createHealthBar(currentHealth, maxHealth) {
  const totalSegments = 15
  let filledSegments = Math.round((currentHealth / maxHealth) * totalSegments)
  if (currentHealth > 0 && filledSegments < 1) filledSegments = 1
  let unfilledSegments = totalSegments - filledSegments
  const filledBar = '🟥'.repeat(filledSegments)
  const unfilledBar = '⬛'.repeat(unfilledSegments)
  return '``' + '『' + `${filledBar}${unfilledBar}` + '』' + '``'
}

async function runBattlePhases(
  interaction,
  playerScore,
  monsterScore,
  monster,
  isAdvantaged,
  huntData,
  battleType // accept battleType
) {
  let playerWins = 0
  let monsterWins = 0
  let momentum = 15
  const maxMomentum = 15
  const imageUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${monster.index}.jpg`

  for (let phase = 1; phase <= 7; phase++) {
    const effectivePlayerScore = isAdvantaged ? playerScore * 1.25 : playerScore

    let playerRoll
    if (huntData.ichorUsed) {
      const minRoll = 0.4 * effectivePlayerScore
      playerRoll = Math.random() * (effectivePlayerScore - minRoll) + minRoll
    } else {
      playerRoll = Math.random() * effectivePlayerScore
    }

    let monsterRoll
    if (battleType === 'boss') {
      const minMonsterRoll = 0.5 * monsterScore
      monsterRoll =
        Math.random() * (monsterScore - minMonsterRoll) + minMonsterRoll
    } else if (battleType === 'mini-boss') {
      const minMonsterRoll = 0.25 * monsterScore
      monsterRoll =
        Math.random() * (monsterScore - minMonsterRoll) + minMonsterRoll
    } else {
      monsterRoll = Math.random() * monsterScore
    }

    const phaseResult = playerRoll >= monsterRoll ? 'Hit!' : 'Miss!'

    let segmentLoss = 0
    if (phaseResult === 'Hit!') {
      playerWins++
      const margin = playerRoll - monsterRoll

      if (margin > 15) segmentLoss = 3
      else if (margin > 5) segmentLoss = 2
      else segmentLoss = 1

      if (playerWins === 1) {
        segmentLoss += 1
      } else if (playerWins === 2) {
        segmentLoss += 2
      } else if (playerWins === 3) {
        segmentLoss += 3
      }

      momentum -= segmentLoss
      if (momentum < 0) momentum = 0

      if (playerWins >= 4) {
        momentum = 0
        break
      }
    } else {
      monsterWins++
    }

    const healthBar = createHealthBar(momentum, maxMomentum)

    // Determine the effects to display
    let effects = 'Effects: None'
    if (isAdvantaged && huntData.ichorUsed) {
      effects = 'Effects: ⏫Advantage, 🧪Boost'
    } else if (isAdvantaged) {
      effects = 'Effects: ⏫Advantage'
    } else if (huntData.ichorUsed) {
      effects = 'Effects: 🧪Boost'
    }

    const phaseEmbed = new EmbedBuilder()
      .setTitle(`Phase ${phase} - Battle with ${monster.name}`)
      .setDescription(
        `**CR:** ${monster.cr}\n` +
          `**Player Score:** ${Math.floor(effectivePlayerScore)}\n` +
          `**Enemy Score:** ${Math.floor(monsterScore)}\n\n` +
          `${effects}\n\n` + // Add the effects line here
          `**Phase ${phase}**\n${phaseResult} Player rolled ${Math.floor(
            playerRoll.toFixed(2)
          )}, Monster rolled ${monsterRoll.toFixed(2)}\n\n` +
          `${healthBar}`
      )
      .setColor('#FF4500')
      .setThumbnail(imageUrl)

    await interaction.followUp({ embeds: [phaseEmbed], ephemeral: true })
    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (playerWins === 4 || momentum <= 0) break
    if (monsterWins === 4) return false
  }
  return playerWins >= 4
}
