const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { Op } = require('sequelize')
const {
  Monster,
  Collection,
  User,
  TrainingSession,
} = require('../../Models/model.js')
const { checkUserAccount } = require('../Account/helpers/checkAccount.js')
const { collectors, stopUserCollector } = require('../../utils/collectors')

function getTrainingData(cr) {
  if (cr >= 21) return { time: '24 hours', bonus: 6 }
  if (cr >= 17) return { time: '12 hours', bonus: 5 }
  if (cr >= 13) return { time: '10 hours', bonus: 4 }
  if (cr >= 9) return { time: '8 hours', bonus: 3 }
  if (cr >= 5) return { time: '4 hours', bonus: 2 }
  return { time: '2 hours', bonus: 1 }
}

function getExtraBonus() {
  const rand = Math.random()
  if (rand < 0.00001) return 6
  if (rand < 0.0001) return 5
  if (rand < 0.001) return 4
  if (rand < 0.01) return 3
  if (rand < 0.1) return 2
  return 0
}

function convertNameToIndex(name) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

async function calculateMaxBaseScore(userId) {
  const userCards = await Collection.findAll({
    where: { userId },
  })

  let max = 0
  userCards.forEach((card) => {
    max += card.rank
  })

  return max
}

function timeStringToMs(timeStr) {
  const parts = timeStr.split(' ')
  const hours = parseInt(parts[0])
  return hours * 3600000
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('train')
    .setDescription(
      'Sacrifice extra card copies to train and boost your base score'
    ),
  async execute(interaction) {
    const userId = interaction.user.id
    stopUserCollector(userId)
    await interaction.deferReply({ ephemeral: true })
    const user = await checkUserAccount(interaction)
    if (!user) return

    const existingSession = await TrainingSession.findOne({
      where: { userId, status: 'in-progress' },
      order: [['createdAt', 'DESC']],
    })
    if (existingSession) {
      const finishTime =
        new Date(existingSession.startTime).getTime() + existingSession.duration
      const now = Date.now()
      if (now < finishTime) {
        const {
          formatTimeRemaining,
        } = require('../../handlers/trainTimerHandler')
        const inProgressEmbed = new EmbedBuilder()
          .setTitle('Training In Progress')
          .setDescription(
            `You are already training. Please wait \`${formatTimeRemaining(
              finishTime - now
            )}\` for this session to complete.`
          )
          .setColor('Orange')
          .setFooter({
            text: 'You cannot start a new training session until the current one is complete.',
          })
        console.log(
          '[Train] Active training session exists. Not sending finish button.'
        )
        return interaction.editReply({
          embeds: [inProgressEmbed],
          components: [],
        })
      } else {
        const embed = new EmbedBuilder()
          .setTitle('Training Complete')
          .setDescription(
            'Your training session has finished! Press the button below to complete training and increase your score.'
          )
          .setColor('Green')
        const finishRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('finish_training')
            .setLabel('Finish Training')
            .setStyle(ButtonStyle.Success)
        )
        console.log(
          '[Train] Training session complete. Sending finish_training button.'
        )
        const replyMessage = await interaction.editReply({
          embeds: [embed],
          components: [finishRow],
        })
        const collector = replyMessage.createMessageComponentCollector({
          filter: (i) => i.user.id === userId,
          time: 60000,
        })
        collectors.set(userId, collector)

        collector.on('collect', async (i) => {
          console.log(
            '[Collector] Interaction received with customId:',
            i.customId
          )
          try {
            if (i.customId === 'finish_training_test') {
              console.log('[finish_training_test] Test button pressed.')
              await i.deferUpdate()
              return i.editReply({
                content: 'Test button pressed.',
                components: [],
              })
            }
            if (i.customId === 'finish_training') {
              console.log('[finish_training] Button clicked.')
              if (!i.deferred && !i.replied) {
                await i.deferUpdate()
              }
              const trainingSession = await TrainingSession.findOne({
                where: { userId, status: 'in-progress' },
                order: [['createdAt', 'DESC']],
              })
              console.log(
                '[finish_training] Retrieved training session:',
                trainingSession
              )
              if (!trainingSession) {
                console.log(
                  '[finish_training] No active training session found.'
                )
                return i.editReply({
                  content: 'No active training session found.',
                  components: [],
                })
              }
              const finishTime =
                new Date(trainingSession.startTime).getTime() +
                trainingSession.duration
              const now = Date.now()
              console.log(
                '[finish_training] finishTime:',
                finishTime,
                'now:',
                now
              )
              if (now < finishTime) {
                const {
                  formatTimeRemaining,
                } = require('../../handlers/trainTimerHandler')
                const remaining = formatTimeRemaining(finishTime - now)
                console.log(
                  '[finish_training] Training still in progress. Remaining:',
                  remaining
                )
                return i.editReply({
                  content: `Training is still in progress. Please wait ${remaining}.`,
                  components: [],
                })
              }
              const maxBase = await calculateMaxBaseScore(userId)
              const currentBase = user.base_damage || 0
              console.log(
                '[finish_training] maxBase:',
                maxBase,
                'currentBase:',
                currentBase
              )
              const allowedIncrease = Math.min(
                trainingSession.bonus,
                maxBase - currentBase
              )

              if (allowedIncrease <= 0) {
                trainingSession.status = 'completed'
                await trainingSession.save()
                return i.editReply({
                  content: `Your base score is already maxed out (${maxBase}). Add new cards or promote them to increase your maximum.`,
                  components: [],
                })
              }

              let extraBonus = 0
              const trainingMonster = await Collection.findOne({
                where: { id: trainingSession.monsterId },
              })
              console.log(
                '[finish_training] Training monster record:',
                trainingMonster
              )
              if (trainingMonster) {
                const baseBonus = getTrainingData(trainingMonster.cr).bonus
                extraBonus = trainingSession.bonus - baseBonus
                console.log(
                  '[finish_training] baseBonus:',
                  baseBonus,
                  'calculated extraBonus:',
                  extraBonus
                )
              }
              user.base_damage = (user.base_damage || 0) + allowedIncrease
              await user.save()
              trainingSession.status = 'completed'
              await trainingSession.save()
              let description = `Your training session is complete and your bonus damage increased by +${allowedIncrease}.\nYour new bonus damage is **${user.base_damage}**.`
              if (allowedIncrease < trainingSession.bonus) {
                description += `\nYou have reached your maximum base score of ${maxBase}.`
                console.log(
                  '[finish_training] Applied partial bonus:',
                  allowedIncrease
                )
              } else if (extraBonus > 0) {
                description += `\nBONUS! Your score increased an additional +${extraBonus}.`
                console.log(
                  '[finish_training] Applied extra bonus:',
                  extraBonus
                )
              }
              const finishEmbed = new EmbedBuilder()
                .setTitle('✅ Training Complete!')
                .setDescription(description)
                .setColor('Green')
                .setFooter({ text: 'Your bonus has been applied.' })
              console.log(
                '[finish_training] Finishing training, sending finishEmbed.'
              )
              return i.editReply({ embeds: [finishEmbed], components: [] })
            }
            if (i.customId === 'select_training') {
              const selectedId = i.values[0].replace('train_', '')
              const selectedMonster = await Collection.findOne({
                where: { id: selectedId, userId },
              })
              if (!selectedMonster) {
                return i.update({
                  content: 'Error: Card not found for training.',
                  components: [],
                })
              }
              const { time, bonus } = getTrainingData(selectedMonster.cr)
              const extra = getExtraBonus()
              const totalBonus = bonus + extra
              const imageUrl = selectedMonster
                ? `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${convertNameToIndex(
                    selectedMonster.name
                  )}.jpg`
                : 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/default.jpg'
              const trainConfirmEmbed = new EmbedBuilder()
                .setTitle(`Train: ${selectedMonster.name}`)
                .setDescription(
                  `**Current Copies:** ${selectedMonster.copies}\n` +
                    `**Card Rank:** ${selectedMonster.rank}\n` +
                    `**CR:** ${selectedMonster.cr}\n\n` +
                    `Sacrificing this card will take **${time}** and grant a base score bonus of **+${bonus}**` +
                    (extra > 0
                      ? ` (with an extra bonus of +${extra} possible)`
                      : '') +
                    `\n\nDo you wish to proceed?`
                )
                .setColor('Blue')
                .setFooter({
                  text: `Your current base score: ${
                    user.base_damage || 0
                  } / ${await calculateMaxBaseScore(userId)}`,
                })
                .setImage(imageUrl)
              const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId(`confirm_training_${selectedMonster.id}`)
                  .setLabel('Train')
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId('cancel_training')
                  .setLabel('Cancel')
                  .setStyle(ButtonStyle.Danger)
              )
              return i.update({
                embeds: [trainConfirmEmbed],
                components: [confirmRow],
              })
            }
            if (i.customId.startsWith('confirm_training_')) {
              await i.deferUpdate()
              const cardId = i.customId.replace('confirm_training_', '')
              const selectedMonster = await Collection.findOne({
                where: { id: cardId, userId },
              })
              if (!selectedMonster) {
                return i.editReply({
                  content: 'Error: Card not found.',
                  components: [],
                })
              }
              const { time, bonus } = getTrainingData(selectedMonster.cr)
              const extra = getExtraBonus()
              const totalBonus = bonus + extra
              const maxBase = await calculateMaxBaseScore(userId)
              const currentBase = user.base_damage || 0
              if (currentBase + totalBonus > maxBase) {
                return i.editReply({
                  content: `Training would exceed your maximum base score (${maxBase}). You cannot train with this card.`,
                  components: [],
                })
              }
              selectedMonster.copies -= 1
              await selectedMonster.save()
              const durationMs = timeStringToMs(time)
              await TrainingSession.create({
                userId,
                monsterId: selectedMonster.id,
                startTime: new Date(),
                duration: durationMs,
                bonus: totalBonus,
                status: 'in-progress',
              })
              const trainingStartedEmbed = new EmbedBuilder()
                .setTitle('⏳ Training Started!')
                .setDescription(
                  `Your training session for **${selectedMonster.name}** has begun.\n` +
                    `It will take **${time}** to complete, after which you'll gain **+${totalBonus}** to your base score.`
                )
                .setColor('Green')
                .setFooter({
                  text: 'Your bonus will be applied automatically once training completes.',
                })
                .setImage(
                  selectedMonster
                    ? `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${convertNameToIndex(
                        selectedMonster.name
                      )}.jpg`
                    : 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/default.jpg'
                )
              collector.stop('completed')
              return i.editReply({
                embeds: [trainingStartedEmbed],
                components: [],
              })
            }
            if (i.customId === 'cancel_training') {
              return i.update({
                content: 'Training cancelled. Returning to main menu...',
                components: [],
              })
            }
          } catch (error) {
            console.error('[Collector] Error in training interaction:', error)
            try {
              await i.editReply({
                content: 'An error occurred during training.',
                components: [],
              })
            } catch (err) {
              console.error('[Collector] Failed to edit reply:', err)
            }
          }
        })

        collector.on('end', async (collected, reason) => {
          console.log(
            '[Collector] Ended with reason:',
            reason,
            'Collected interactions:',
            collected.size
          )
          try {
            await interaction.editReply({ components: [] })
          } catch (error) {
            console.error('[Collector] Error ending training collector:', error)
          }
        })
        return
      }
    }

    // If no active training session exists, proceed with training selection.
    const userMonsters = await Collection.findAll({
      where: { userId, copies: { [Op.gt]: 0 } },
    })
    if (!userMonsters || userMonsters.length === 0) {
      return interaction.editReply({
        content: 'You have no cards available for training.',
        components: [],
      })
    }

    const maxBase = await calculateMaxBaseScore(userId)
    // New catch: if user's base damage is at or above the maximum, do not show the training dropdown.
    if ((user.base_damage || 0) >= maxBase) {
      const embed = new EmbedBuilder()
        .setTitle('Training Unavailable')
        .setDescription(
          `Your base damage is already maxed out (${maxBase}). You cannot train further.`
        )
        .setColor('Blue')
      return interaction.editReply({ embeds: [embed], components: [] })
    }

    const trainExplanationEmbed = new EmbedBuilder()
      .setTitle('🏋️ Train Your Hunter')
      .setDescription(
        `Training lets you sacrifice a card copy to permanently boost your score. The maximum base bonus increases with every card you own and every promotion.\n\n` +
          `Training costs time and a card copy. Depending on the card's CR:\n` +
          `• CR 1–4: 2 hours, +1 bonus\n` +
          `• CR 5–8: 4 hours, +2 bonus\n` +
          `• CR 9–12: 8 hours, +3 bonus\n` +
          `• CR 13–16: 10 hours, +4 bonus\n` +
          `• CR 17–20: 12 hours, +5 bonus\n` +
          `• CR 21+: 24 hours, +6 bonus\n\n` +
          `Select a card below to sacrifice for training.`
      )
      .setColor('Blue')
      .setFooter({
        text: `Your current base score: ${user.base_damage || 0} / ${maxBase}`,
      })

    const monsterOptions = userMonsters.map((monster) => {
      const { time, bonus } = getTrainingData(monster.cr)
      return {
        label: `${monster.name} (Lv. ${monster.rank})`,
        value: `train_${monster.id}`,
        description: `Copies: ${monster.copies} | Score gain: +${bonus} | Training time: ${time}`,
      }
    })

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_training')
        .setPlaceholder('Select a card to sacrifice for training')
        .addOptions(monsterOptions.slice(0, 25))
    )

    const replyMessage = await interaction.editReply({
      embeds: [trainExplanationEmbed],
      components: [selectRow],
    })

    const collector = replyMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 60000,
    })
    collectors.set(userId, collector)

    collector.on('collect', async (i) => {
      console.log('[Collector] Interaction received with customId:', i.customId)
      try {
        if (i.customId === 'select_training') {
          const selectedId = i.values[0].replace('train_', '')
          const selectedMonster = await Collection.findOne({
            where: { id: selectedId, userId },
          })
          if (!selectedMonster) {
            return i.update({
              content: 'Error: Card not found for training.',
              components: [],
            })
          }
          const { time, bonus } = getTrainingData(selectedMonster.cr)
          const extra = getExtraBonus()
          const totalBonus = bonus + extra
          const imageUrl = selectedMonster
            ? `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${convertNameToIndex(
                selectedMonster.name
              )}.jpg`
            : 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/default.jpg'
          const trainConfirmEmbed = new EmbedBuilder()
            .setTitle(`Train: ${selectedMonster.name}`)
            .setDescription(
              `**Current Copies:** ${selectedMonster.copies}\n` +
                `**Card Rank:** ${selectedMonster.rank}\n` +
                `**CR:** ${selectedMonster.cr}\n\n` +
                `Sacrificing this card will take **${time}** and grant a base score bonus of **+${bonus}**` +
                (extra > 0
                  ? ` (with an extra bonus of +${extra} possible)`
                  : '') +
                `\n\nDo you wish to proceed?`
            )
            .setColor('Blue')
            .setFooter({
              text: `Your current base score: ${
                user.base_damage || 0
              } / ${await calculateMaxBaseScore(userId)}`,
            })
            .setImage(imageUrl)
          const confirmRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`confirm_training_${selectedMonster.id}`)
              .setLabel('Train')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('cancel_training')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Danger)
          )
          return i.update({
            embeds: [trainConfirmEmbed],
            components: [confirmRow],
          })
        }
        if (i.customId.startsWith('confirm_training_')) {
          await i.deferUpdate()
          const cardId = i.customId.replace('confirm_training_', '')
          const selectedMonster = await Collection.findOne({
            where: { id: cardId, userId },
          })
          if (!selectedMonster) {
            return i.editReply({
              content: 'Error: Card not found.',
              components: [],
            })
          }
          const { time, bonus } = getTrainingData(selectedMonster.cr)
          const extra = getExtraBonus()
          const totalBonus = bonus + extra
          const maxBase = await calculateMaxBaseScore(userId)
          const currentBase = user.base_damage || 0
          if (currentBase + totalBonus > maxBase) {
            return i.editReply({
              content: `Training would exceed your maximum base score (${maxBase}). You cannot train with this card.`,
              components: [],
            })
          }
          selectedMonster.copies -= 1
          await selectedMonster.save()
          const durationMs = timeStringToMs(time)
          await TrainingSession.create({
            userId,
            monsterId: selectedMonster.id,
            startTime: new Date(),
            duration: durationMs,
            bonus: totalBonus,
            status: 'in-progress',
          })
          const trainingStartedEmbed = new EmbedBuilder()
            .setTitle('⏳ Training Started!')
            .setDescription(
              `Your training session for **${selectedMonster.name}** has begun.\n` +
                `It will take **${time}** to complete, after which you'll gain **+${totalBonus}** to your base score.`
            )
            .setColor('Green')
            .setFooter({
              text: 'Your bonus will be applied automatically once training completes.',
            })
            .setImage(
              selectedMonster
                ? `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${convertNameToIndex(
                    selectedMonster.name
                  )}.jpg`
                : 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/default.jpg'
            )
          await i.editReply({ embeds: [trainingStartedEmbed], components: [] })
          collector.stop('completed')
        }
        if (i.customId === 'cancel_training') {
          return i.update({
            content: 'Training cancelled. Returning to main menu...',
            components: [],
          })
        }
      } catch (error) {
        console.error('[Collector] Error in training interaction:', error)
        try {
          await i.editReply({
            content: 'An error occurred during training.',
            components: [],
          })
        } catch (err) {
          console.error('[Collector] Failed to edit reply:', err)
        }
      }
    })

    collector.on('end', async (collected, reason) => {
      console.log(
        '[Collector] Ended with reason:',
        reason,
        'Collected interactions:',
        collected.size
      )
      try {
        await interaction.editReply({ components: [] })
      } catch (error) {
        console.error('[Collector] Error ending training collector:', error)
      }
    })
  },
}
