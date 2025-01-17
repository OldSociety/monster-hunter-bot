// hunt.js

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
} = require('discord.js')
const { Collection } = require('../../Models/model.js')

const { checkUserAccount } = require('../Account/checkAccount.js')
const {
  cacheHuntMonsters,
  pullMonsterByCR,
  pullSpecificMonster,
} = require('../../handlers/huntCacheHandler')
const { addGoldToUser } = require('../../handlers/rewardHandler')
const {
  checkAdvantage,
} = require('../../utils/huntUtility/huntUtils.js')

const { createPageButtons } = require('./utils/createPageButtons.js')
const { huntPages } = require('./huntPages.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription(
      'Embark on a hunt and engage in combat with a series of monsters'
    ),

  async execute(interaction) {
    // const allowedChannels = [
    //   process.env.WINTERCHANNELID,
    //   process.env.BOTTESTCHANNELID,
    //   process.env.DEVBOTTESTCHANNELID,
    // ]

    // if (!allowedChannels.includes(interaction.channel.id)) {
    //   await interaction.reply({
    //     content: `🎰 This game can only be played in designated Blood Hunters channels.`,
    //     ephemeral: true,
    //   })
    //   return
    // }
    await interaction.deferReply({ ephemeral: true })
    const userId = interaction.user.id

    const user = await checkUserAccount(interaction)
    if (!user) return

    user.unlockedPages = user.unlockedPages || ['page1']
    user.completedHunts = user.completedHunts || [] 

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
    user.completedLevels = user.completedLevels || 0

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
  const currentPage = user.unlockedPage || 'page1'
  const pageData = huntPages[currentPage]

  if (!pageData) {
    return interaction.reply({ content: 'Invalid hunt page!', ephemeral: true })
  }

  user.completedHunts = user.completedHunts || []

  // Filter unlocked hunts
  const unlockedHunts = pageData.hunts.filter(hunt => {
    return user.completedHunts.includes(hunt.key) || hunt.key === 'hunt1'
  })

  // Create dropdown for available hunts
  const huntOptions = unlockedHunts.map(hunt => ({
    label: hunt.name,
    description: hunt.description,
    value: `hunt_${hunt.key}`,
  }))

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('hunt_select')
    .setPlaceholder('Choose a hunt')
    .addOptions(huntOptions)

  const dropdownRow = new ActionRowBuilder().addComponents(selectMenu)

  // ✅ Ensure page buttons are valid before adding them
  const pageButtonsRow = createPageButtons(currentPage, user.unlockedPages || ['page1'])

  const embed = new EmbedBuilder()
    .setTitle(pageData.name)
    .setDescription(pageData.description)
    .setColor('Green')

  const components = [dropdownRow]
  
  if (pageButtonsRow.length > 0) {
    components.push(pageButtonsRow)
  }

  await interaction.editReply({
    embeds: [embed],
    components: components, // ✅ Only add valid components
    ephemeral: true,
  })
}



async function startNewEncounter(interaction, user, huntData) {
  const currentBattle = huntData.level.battles[huntData.currentBattleIndex]
  let monster

  // Fetch the monster based on the battle type
  if (huntData.lastMonster && huntData.retries > 0) {
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

  // Set monster's health based on difficulty
  let monsterScore = monster.hp
  switch (currentBattle.difficulty) {
    case 'easy':
      monsterScore = monster.hp / 2
      break
    case 'medium':
      monsterScore = monster.hp * 0.75
      break
    case 'hard':
      monsterScore = monster.hp * 1.25
      break
    case 'very-hard':
      monsterScore = monster.hp * 1.5
      break
    case 'boss-half':
      monsterScore = monster.hp / 2
      break
    case 'boss-full':
      monsterScore = monster.hp
      break
    case 'boss-strong':
      monsterScore = monster.hp * 1.25
      break
    default:
      monsterScore = monster.hp
  }

  monsterScore = Math.max(monsterScore, 8)

  let title
  if (currentBattle.type === 'boss') {
    title = `${monster.name}    ` + '``' + `Boss!` + '``'
  } else if (currentBattle.type === 'mini-boss') {
    title = `${monster.name}    ` + '``' + `Mini-boss` + '``'
  } else {
    const encounterNumber = huntData.currentBattleIndex + 1
    const totalBattles =
      huntData.level.totalBattles || huntData.level.battles.length
    title = `A wild ${monster.name} appears! - ${encounterNumber}/${totalBattles}`
  }

  const monsterEmbed = new EmbedBuilder()
    .setTitle(title)
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
        .setStyle(ButtonStyle.Danger)
    )
  }
  if (user.spellsword_score > 0) {
    styleRow.addComponents(
      new ButtonBuilder()
        .setCustomId('style_spellsword')
        .setLabel(`Spellsword: ${user.spellsword_score}`)
        .setStyle(ButtonStyle.Primary)
    )
  }
  if (user.stealth_score > 0) {
    styleRow.addComponents(
      new ButtonBuilder()
        .setCustomId('style_stealth')
        .setLabel(`Stealth: ${user.stealth_score}`)
        .setStyle(ButtonStyle.Success)
    )
  }

  await interaction.followUp({
    embeds: [monsterEmbed],
    components: [styleRow],
    ephemeral: true,
  })

  // Stop any previous collector
  if (huntData.styleCollector) huntData.styleCollector.stop()

  // Create a new collector
  const filter = (i) => i.user.id === interaction.user.id
  const styleCollector = interaction.channel.createMessageComponentCollector({
    filter,
    max: 1,
    time: 15000,
  })

  huntData.styleCollector = styleCollector // Track current collector

  styleCollector.on('collect', async (styleInteraction) => {
    await styleInteraction.deferUpdate()
    const selectedStyle = styleInteraction.customId.split('_')[1]
    const playerScore = user[`${selectedStyle}_score`]
    const advMultiplier = checkAdvantage(selectedStyle, monster.type)

    const playerWins = await runBattlePhases(
      interaction,
      user,
      playerScore,
      monsterScore,
      monster,
      advMultiplier,
      huntData,
      currentBattle.type
    )

    if (playerWins) {
      let rewardAmount = currentBattle.goldReward || 0

      if (
        (currentBattle.type === 'boss' || currentBattle.type === 'mini-boss') &&
        huntData.level
      ) {
        const levelNumber = parseInt(huntData.level.key.replace('hunt', ''))
        const isFirstDefeat = user.completedLevels < levelNumber

        if (
          isFirstDefeat &&
          typeof currentBattle.firstGoldReward !== 'undefined'
        ) {
          rewardAmount = currentBattle.firstGoldReward
        }
      }

      await addGoldToUser(user, rewardAmount)
      huntData.totalGoldEarned += rewardAmount
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
      .setFooter({
        text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.gems} 🧪${user.currency.ichor}`,
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
      text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.gems} 🧪${user.currency.ichor}`,
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

async function displayHuntSummary(interaction, user, huntData, levelCompleted) {
  const summaryEmbed = new EmbedBuilder()
    .setTitle('Hunt Summary')
    .setDescription(`**Gold Earned:** 🪙${huntData.totalGoldEarned}\n**Tokens Earned:** 🧿${huntData.totalMonstersDefeated}`)
    .setColor('#FFD700')

  if (levelCompleted) {
    const levelNumber = parseInt(huntData.level.key.replace('hunt', ''))
    const isFirstCompletion = user.completedLevels < levelNumber

    if (isFirstCompletion) {
      summaryEmbed.addFields({
        name: 'Congratulations!',
        value: `You have defeated the ${huntData.level.name} and unlocked the next hunt.`,
      })
      user.completedLevels = levelNumber

      // Check if the next page should be unlocked
      if (huntData.level.unlocksPage && !user.unlockedPages.includes(huntData.level.unlocksPage)) {
        user.unlockedPages.push(huntData.level.unlocksPage)
        summaryEmbed.addFields({
          name: 'New Page Unlocked!',
          value: `You have unlocked **${huntPages[huntData.level.unlocksPage].name}**. Use the navigation buttons to switch pages.`,
        })
      }

      await user.save()
    }
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
  user,
  playerScore,
  monsterScore,
  monster,
  advMultiplier,
  huntData,
  battleType // accept battleType
) {
  let playerWins = 0
  let monsterWins = 0
  let momentum = 15
  const maxMomentum = 15
  const imageUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${monster.index}.jpg`

  for (let phase = 1; phase <= 7; phase++) {
    const isDisadvantaged = advMultiplier < 1
    const isAdvantaged = advMultiplier > 1
    const effectivePlayerScore = playerScore * advMultiplier
    
    // Calculate the minimum roll if Ichor is used
    const minimumRoll = huntData.ichorUsed
      ? playerScore * 0.3
      : playerScore * 0.15
    
    // Generate the player's roll, ensuring it respects the minimum threshold
    playerRoll = Math.round(
      Math.max(
        Math.random() * (effectivePlayerScore - minimumRoll) + minimumRoll,
        minimumRoll
      )
    )
    
    let monsterRoll = Math.random() * monsterScore
    
    // Ensure consistent rounding
    playerRoll = Math.round(playerRoll)
    monsterRoll = Math.round(monsterRoll)
    
    const phaseResult = playerRoll >= monsterRoll ? 'Hit!' : 'Miss!'
    console.log(`Phase ${phase}: Result = ${phaseResult}`)
    
    if (phaseResult === 'Hit!') {
      playerWins++
      const margin = playerRoll - monsterRoll
    
      if (margin > 15) segmentLoss = 3
      else if (margin > 5) segmentLoss = 2
      else segmentLoss = 1
    
      momentum -= Math.min(segmentLoss, momentum)
    
      if (playerWins >= 4) {
        user.currency.gems = (user.currency.gems || 0) + 1
        user.changed('currency', true)
        await user.save()
        return true
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
    } else if (isDisadvantaged && huntData.ichorUsed) {
      effects = 'Effects: ⏬Disadvantage, 🧪Boost'
    } else if (isDisadvantaged) {
      effects = 'Effects: ⏬Disadvantage'
    } else if (huntData.ichorUsed) {
      effects = 'Effects: 🧪Boost'
    }
    
    const phaseEmbed = new EmbedBuilder()
      .setTitle(`Phase ${phase} - Battle with ${monster.name}`)
      .setDescription(
        `**CR:** ${monster.cr}\n` +
          `**Player Score:** ${Math.floor(effectivePlayerScore)}\n` +
          `**Enemy Score:** ${Math.floor(monsterScore)}\n\n` +
          `${effects}\n\n` +
          `**Phase ${phase}**\n${phaseResult} Player rolled ${Math.max(
            Math.floor(playerRoll.toFixed(2)),
            1
          )}, Monster rolled ${Math.max(monsterRoll.toFixed(2), 1)}\n\n` +
          `${healthBar}`
      )
      .setColor('#FF4500')
      .setThumbnail(imageUrl)

    await interaction.followUp({ embeds: [phaseEmbed], ephemeral: true })
    await new Promise((resolve) => setTimeout(resolve, 2000))
    // console.log(
    //   `Phase ${phase}: Player Wins = ${playerWins}, Monster Wins = ${monsterWins}, Momentum = ${momentum}`
    // )
    if (playerWins === 4 || momentum <= 0) break
    if (monsterWins === 4) {
      // console.log('Monster Wins the Battle!')
      return false
    }
  }
  return playerWins >= 4
}

async function handlePagination(interaction, user) {
  const customId = interaction.customId
  if (customId.startsWith('prev_page_') || customId.startsWith('next_page_')) {
    const newPage = customId.split('_')[2]

    if (!huntPages[newPage]) {
      return interaction.reply({ content: 'Invalid page selection.', ephemeral: true })
    }

    user.unlockedPage = newPage
    await showLevelSelection(interaction, user, {})
  }
}