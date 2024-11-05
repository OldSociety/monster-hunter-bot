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
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('hunt')
      .setDescription(
        'Embark on a hunt and engage in combat with a series of monsters'
      ),
  
    async execute(interaction) {
      await interaction.deferReply()
      const userId = interaction.user.id
      const user = await User.findOne({ where: { user_id: userId } })
      if (!user) {
        await interaction.editReply({
          content: "You don't have an account. Use `/account` to create one.",
          ephemeral: true,
        })
        return
      }
  
      // Step 1: Loading embed while caching monsters
      const loadingEmbed = new EmbedBuilder()
        .setColor(0xffcc00)
        .setDescription('Loading hunt data, please wait...')
      await interaction.editReply({ embeds: [loadingEmbed] })
  
      // Cache the monster list if not already done
      await cacheHuntMonsters()
  
      // Step 2: Confirmation to start the hunt
      const startHuntEmbed = new EmbedBuilder()
        .setTitle('Prepare for the Hunt')
        .setDescription(
          'You are about to embark on a monster hunt. You will face a series of monsters on this hunt, and it will continue until you either defeat all the monsters or die trying. Do you want to continue?'
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
      })
  
      const filter = (i) => i.user.id === userId
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000,
      })
  
      collector.on('collect', async (i) => {
        if (i.customId === 'cancel_hunt') {
          await i.update({
            content: 'Hunt cancelled.',
            embeds: [],
            components: [],
          })
          collector.stop()
          return
        }
        if (i.customId === 'confirm_hunt') {
          await i.deferUpdate()
  
          // Step 3: Choose difficulty
          const difficultyEmbed = new EmbedBuilder()
            .setTitle('Choose Hunt Difficulty')
            .setDescription(
              'Select your hunting difficulty: Easy, Medium, or Hard'
            )
            .setColor('#00FF00')
  
          const easyButton = new ButtonBuilder()
            .setCustomId('difficulty_easy')
            .setLabel('Easy')
            .setStyle(ButtonStyle.Primary)
          const mediumButton = new ButtonBuilder()
            .setCustomId('difficulty_medium')
            .setLabel('Medium')
            .setStyle(ButtonStyle.Secondary)
          const hardButton = new ButtonBuilder()
            .setCustomId('difficulty_hard')
            .setLabel('Hard')
            .setStyle(ButtonStyle.Danger)
          const difficultyRow = new ActionRowBuilder().addComponents(
            easyButton,
            mediumButton,
            hardButton
          )
  
          await interaction.editReply({
            embeds: [difficultyEmbed],
            components: [difficultyRow],
          })
  
          collector.stop() // Stop previous collector to avoid conflicts
  
          const difficultyCollector =
            interaction.channel.createMessageComponentCollector({
              filter,
              time: 15000,
            })
  
          difficultyCollector.on('collect', async (difficultyInteraction) => {
            await difficultyInteraction.deferUpdate()
            const selectedDifficulty =
              difficultyInteraction.customId.split('_')[1]
  
            // Step 4: Choose fighting style
            const styleEmbed = new EmbedBuilder()
              .setTitle('Choose Fighting Style')
              .setDescription(
                'Select your preferred fighting style: Brute, Caster, or Stealth. This will determine which score is used in combat.'
              )
              .setColor('#FFA500')
  
            const bruteButton = new ButtonBuilder()
              .setCustomId('style_brute')
              .setLabel('Brute')
              .setStyle(ButtonStyle.Primary)
            const casterButton = new ButtonBuilder()
              .setCustomId('style_caster')
              .setLabel('Caster')
              .setStyle(ButtonStyle.Secondary)
            const stealthButton = new ButtonBuilder()
              .setCustomId('style_stealth')
              .setLabel('Stealth')
              .setStyle(ButtonStyle.Success)
            const styleRow = new ActionRowBuilder().addComponents(
              bruteButton,
              casterButton,
              stealthButton
            )
  
            await interaction.editReply({
              embeds: [styleEmbed],
              components: [styleRow],
            })
  
            difficultyCollector.stop() // Stop previous collector
  
            const styleCollector =
              interaction.channel.createMessageComponentCollector({
                filter,
                time: 15000,
              })
  
            styleCollector.on('collect', async (styleInteraction) => {
              await styleInteraction.deferUpdate()
              const selectedStyle = styleInteraction.customId.split('_')[1]
  
              // Step 5: Begin the hunt
              const beginHuntEmbed = new EmbedBuilder()
                .setTitle('Let the Hunt Begin...')
                .setDescription(
                  `Difficulty: **${
                    selectedDifficulty.charAt(0).toUpperCase() +
                    selectedDifficulty.slice(1)
                  }**\n` +
                    `Fighting Style: **${
                      selectedStyle.charAt(0).toUpperCase() +
                      selectedStyle.slice(1)
                    }**\n\n` +
                    `Get ready for the first monster!`
                )
                .setColor('#FF4500')
  
              await interaction.editReply({
                embeds: [beginHuntEmbed],
                components: [],
              })
              styleCollector.stop()
  
              // Start hunt at CR 1
              let currentCR = 1
              let playerIsAlive = true
  
              while (playerIsAlive) {
                const monster = pullMonsterByCR(currentCR)
  
                if (!monster) {
                  await interaction.followUp(
                    `No monsters found for CR ${currentCR}. Ending hunt.`
                  )
                  break
                }
  
                // Calculate scores, advantage, and win probability
                const monsterScore = monster.cr * (monster.hp / 10) + 25
                const playerScore = user[`${selectedStyle}_score`]
                const isAdvantaged = checkAdvantage(
                  selectedStyle,
                  monster.combatType
                )
                const winChance = calculateWinChance(
                  playerScore,
                  monsterScore,
                  isAdvantaged
                )
  
                // Phase tracking and display
                for (let phase = 1; phase <= 5; phase++) {
                  const phaseEmbed = new EmbedBuilder()
                    .setTitle(`A wild ${monster.name} appears!`)
                    .setDescription(
                      `**CR:** ${monster.cr}\n` +
                        `**Player ${
                          selectedStyle.charAt(0).toUpperCase() +
                          selectedStyle.slice(1)
                        } Score:** ${playerScore}\n` +
                        `**Enemy Score:** ${monsterScore}\n` +
                        `**Advantage:** ${isAdvantaged ? 'True' : 'False'}\n` +
                        `**Chance of Winning:** ${winChance.base}%${
                          isAdvantaged
                            ? ` -> ${winChance.adjusted}% (Advantage)`
                            : ''
                        }`
                    )
                    .setColor('#FF4500')
                    .addFields({
                      name: `Phase ${phase}`,
                      value: rollAndDisplayPhase(
                        playerScore,
                        monsterScore,
                        winChance.adjusted
                      ),
                    })
                    .setThumbnail(monster.image)
  
                  await interaction.followUp({ embeds: [phaseEmbed] })
                  await new Promise((resolve) => setTimeout(resolve, 2000)) // Delay for player processing
                }
  
                playerIsAlive = playerScore >= monsterScore
                if (playerIsAlive) {
                  await interaction.followUp(
                    `You defeated the ${
                      monster.name
                    }! Moving to CR ${++currentCR}...`
                  )
                } else {
                  await interaction.followUp(
                    `You were defeated by the ${monster.name}. Hunt ended.`
                  )
                }
              }
            })
          })
        }
      })
  
      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          await interaction.editReply({
            content: 'Session expired. Please start again.',
            components: [],
          })
        }
      })
    },
  }
  
  function checkAdvantage(playerStyle, monsterType) {
    const advantageMap = {
      brute: 'stealth',
      stealth: 'caster',
      caster: 'brute',
    }
    return advantageMap[playerStyle] === monsterType
  }
  
  function calculateWinChance(playerScore, monsterScore, isAdvantaged) {
    const baseWinChance = Math.round(
      (playerScore / (playerScore + monsterScore)) * 100
    )
    const adjustedWinChance = isAdvantaged
      ? Math.min(baseWinChance + 25, 100)
      : baseWinChance
    return { base: baseWinChance, adjusted: adjustedWinChance }
  }
  
  function rollAndDisplayPhase(playerScore, monsterScore, winChance) {
    const playerRoll = Math.random() * playerScore
    const monsterRoll = Math.random() * monsterScore
    return playerRoll > monsterRoll
      ? `**Hit!** Player rolled ${playerRoll.toFixed(
          2
        )}, Monster rolled ${monsterRoll.toFixed(2)}`
      : `**Miss!** Player rolled ${playerRoll.toFixed(
          2
        )}, Monster rolled ${monsterRoll.toFixed(2)}`
  }
  