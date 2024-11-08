const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { User } = require('../../Models/model.js')
const {
  cacheHuntMonsters,
  pullMonsterByCR,
} = require('../../handlers/huntCacheHandler')
const {
  calculateReward,
  addGoldToUser,
} = require('../../handlers/rewardHandler')
const {
  checkAdvantage,
  calculateWinChance,
} = require('../../utils/huntUtility/huntUtils.js')
const difficultyOptions = {
  easy: 0.5,
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription(
      'Embark on a hunt and engage in combat with a series of monsters'
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })
    const userId = interaction.user.id
    const user = await User.findOne({ where: { user_id: userId } })

    if (!user) {
      await interaction.editReply({
        content: "You don't have an account. Use `/account` to create one.",
        ephemeral: true,
      })
      return
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xffcc00)
      .setDescription('Loading hunt data, please wait...')
    await interaction.editReply({ embeds: [loadingEmbed] })

    await cacheHuntMonsters()

    const startHuntEmbed = new EmbedBuilder()
      .setTitle('Prepare for the Hunt')
      .setDescription(
        'You are about to embark on a monster hunt. Do you want to continue?'
      )
      .setColor('#FF0000')

    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_hunt')
      .setLabel('Continue')
      .setStyle(ButtonStyle.Success)
    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_hunt')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
    const startRow = new ActionRowBuilder().addComponents(
      confirmButton,
      cancelButton
    )

    await interaction.editReply({
      embeds: [startHuntEmbed],
      components: [startRow],
      ephemeral: true,
    })

    const filter = (i) => i.user.id === userId

    // Create a collector with a limited lifespan and maximum interaction count
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
      if (i.customId === 'confirm_hunt') {
        await i.deferUpdate()
        collector.stop()
        await startNewEncounter(interaction, user, 1, 'easy')
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
  },
}

async function startNewEncounter(
  interaction,
  user,
  currentCR,
  difficulty = 'easy'
) {
  let adjustedCR =
    currentCR === 1 ? 0.25 : currentCR === 2 ? 0.5 : currentCR - 1

  let monster
  do {
    monster = pullMonsterByCR(adjustedCR)
  } while (!monster || !monster.index)

  const imageUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.index}.jpg`
  let monsterScore = monster.cr * (monster.hp / 10) + 10
  if (difficulty === 'easy') monsterScore *= difficultyOptions[difficulty]

  const monsterEmbed = new EmbedBuilder()
    .setTitle(`A wild ${monster.name} appears!`)
    .setDescription(`**CR:** ${adjustedCR}\n**Type:** ${monster.type}`)
    .setColor('#FFA500')
    .setThumbnail(imageUrl)

  const styleRow = new ActionRowBuilder()
  if (user.brute_score > 0) {
    styleRow.addComponents(
      new ButtonBuilder()
        .setCustomId('style_brute')
        .setLabel(`Brute: ${user.brute_score}`)
        .setStyle(ButtonStyle.Primary)
    )
  }
  if (user.caster_score > 0) {
    styleRow.addComponents(
      new ButtonBuilder()
        .setCustomId('style_caster')
        .setLabel(`Caster: ${user.caster_score}`)
        .setStyle(ButtonStyle.Secondary)
    )
  }
  if (user.sneak_score > 0) {
    styleRow.addComponents(
      new ButtonBuilder()
        .setCustomId('style_sneak')
        .setLabel(`Sneak: ${user.sneak_score}`)
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
    const winChance = calculateWinChance(
      playerScore,
      monsterScore,
      isAdvantaged
    )
    const playerWins = await runBattlePhases(
      interaction,
      playerScore,
      monsterScore,
      winChance,
      monster,
      isAdvantaged
    )

    if (playerWins) {
      const goldReward = calculateReward(Math.floor(adjustedCR))
      await addGoldToUser(user, goldReward)

      const continueEmbed = new EmbedBuilder()
        .setTitle('Battle Complete')
        .setDescription(
          `You defeated the ${monster.name} and earned ${goldReward} gold. Continue or collect rewards?`
        )
        .setColor('#00FF00')

      const continueButton = new ButtonBuilder()
        .setCustomId('continue_hunt')
        .setLabel('Continue Hunt')
        .setStyle(ButtonStyle.Success)
      const endHuntButton = new ButtonBuilder()
        .setCustomId('end_hunt')
        .setLabel('End Hunt and Collect Rewards')
        .setStyle(ButtonStyle.Danger)
      const continueRow = new ActionRowBuilder().addComponents(
        continueButton,
        endHuntButton
      )

      await interaction.followUp({
        embeds: [continueEmbed],
        components: [continueRow],
        ephemeral: true,
      })

      const continueCollector =
        interaction.channel.createMessageComponentCollector({
          filter,
          max: 1,
          time: 15000,
        })

      continueCollector.on('collect', async (continueInteraction) => {
        await continueInteraction.deferUpdate()
        if (continueInteraction.customId === 'continue_hunt') {
          continueCollector.stop()
          await startNewEncounter(interaction, user, currentCR + 1, difficulty)
        } else if (continueInteraction.customId === 'end_hunt') {
          continueCollector.stop()
          await displayHuntSummary(interaction, user)
        }
      })
    } else {
      await displayHuntSummary(interaction, user)
    }
  })
}

async function displayHuntSummary(interaction, user) {
  const summaryEmbed = new EmbedBuilder()
    .setTitle(`You've been defeated`)
    .setDescription(`**Total Monsters Defeated:** X\n**Total Gold Earned:** Y`)
    .setColor('#FFD700')

  await interaction.followUp({ embeds: [summaryEmbed], ephemeral: false })
}

function createHealthBar(currentHealth, maxHealth) {
  const totalSegments = 15 // Total number of segments for the health bar
  let filledSegments = Math.round((currentHealth / maxHealth) * totalSegments)
  if (currentHealth > 0 && filledSegments < 1) filledSegments = 1
  let unfilledSegments = totalSegments - filledSegments
  const filledBar = '🟥'.repeat(filledSegments)
  const unfilledBar = '⬛'.repeat(unfilledSegments)
  return '`' + '『' + `${filledBar}${unfilledBar}` + '』' + '`'
}

async function runBattlePhases(
  interaction,
  playerScore,
  monsterScore,
  winChance,
  monster,
  isAdvantaged
) {
  let playerWins = 0
  let monsterWins = 0
  let momentum = 15
  const maxMomentum = 15
  const imageUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.index}.jpg`

  for (let phase = 1; phase <= 7; phase++) {
    const effectivePlayerScore = isAdvantaged ? playerScore * 1.25 : playerScore
    const playerRoll = Math.random() * effectivePlayerScore
    const monsterRoll = Math.random() * monsterScore
    const phaseResult = playerRoll > monsterRoll ? 'Hit!' : 'Miss!'

    let segmentLoss = 0
    if (phaseResult.includes('Hit!')) {
      playerWins++
      const margin = playerRoll - monsterRoll

      // Determine base segment loss based on margin
      if (margin > 15) segmentLoss = 3
      else if (margin > 5) segmentLoss = 2
      else segmentLoss = 1

      // Incremental bonus based on number of player wins
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
    const winChanceText = winChance
      ? `**Chance of Winning:** ${winChance.base}%${
          isAdvantaged ? ` -> ${winChance.adjusted}% (Advantage)` : ''
        }`
      : '**Chance of Winning:** N/A'

    const phaseEmbed = new EmbedBuilder()
      .setTitle(`Phase ${phase} - Battle with ${monster.name}`)
      .setDescription(
        `**CR:** ${monster.cr}\n` +
          `**Player Score:** ${effectivePlayerScore}\n` +
          `**Enemy Score:** ${monsterScore}\n` +
          `${winChanceText}\n` +
          `**Phase ${phase}**\n${phaseResult} Player rolled ${playerRoll.toFixed(
            2
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
