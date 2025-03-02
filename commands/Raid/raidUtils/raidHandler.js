const { EmbedBuilder } = require('discord.js')

const { checkAdvantage } = require('../../Hunt/huntUtils/huntHelpers.js')

const { pullSpecificMonster } = require('../../../handlers/cacheHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/userMonsterHandler')
const { updateTop3AndUserScore } = require('../../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../../utils/starRating')

const { classifyMonsterType } = require('../../Hunt/huntUtils/huntHelpers')

const { createHealthBar } = require('../../Hunt/huntUtils/battleHandler.js')
const { collectors, stopUserCollector } = require('../../../utils/collectors')
const { RaidBoss } = require('../../../Models/model.js')
const {
  raidBossRotation,
  enterCooldownEarly,
  getNextActiveTime,
} = require('../../../handlers/raidTimerHandler.js')
const {
  getUserFooter,
  createWelcomeEmbed,
  createRaidBossEmbed,
  createInitialActionRow,
  createUpdatedActionRow,
} = require('./raidHelpers.js')

const { formatTimeRemaining } = require('./timeUtils.js')
const { processGlobalRaidRewards } = require('./raidRewardsProcessor.js')
const { globalRaidParticipants } = require('./raidState.js')

const {
  getUniformBaseRewards,
  getUniformGearReward,
  getUniformCardRewards,
} = require('./raidRewards')

let rewardsDistributed = false

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
  globalRaidParticipants.add(interaction.user.id)

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true })
  }

  rewardsDistributed = false
  const now = Date.now()

  const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
  console.log(`[Raid] Retrieved ${raidBosses.length} raid bosses.`)

  if (!raidBosses || raidBosses.length === 0) {
    console.log('[Raid] No valid raid bosses found.')
    return interaction.editReply({
      content: 'Error: No valid raid bosses found.',
      ephemeral: true,
    })
  }

  const selectedBoss = raidBosses[raidBossRotation.currentIndex]
  console.log('[Raid] Selected raid boss:', selectedBoss.name)

  // Use the global rotation phase directly.
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
    boss_score: selectedBoss.boss_score,
    imageUrl: selectedBoss.imageUrl,
    lootDrops: selectedBoss.lootDrops || [],
    activePhase: raidBossRotation.phase === 'active',
    instance: selectedBoss,
  }

  // If the raid is inactive (cooldown), show the rewards summary (or no-participant notice).
  if (raidBossRotation.phase !== 'active') {
    console.log(
      '[Raid] Raid is inactive (cooldown phase). Initiating end-of-raid procedure.'
    )
    const now = Date.now()
    // Calculate the remaining time until the next active phase.
    const cooldownDuration = getNextActiveTime()
    const elapsed = now - raidBossRotation.lastSwitch
    const timeRemaining = Math.max(0, cooldownDuration - elapsed)

    if (globalRaidParticipants.size === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🏆 Raid Complete.')
        .setDescription(
          `No one participated in this raid. No rewards were distributed.\n\n` +
            `Raids will restart in ${formatTimeRemaining(timeRemaining)}`
        )
        .setColor('Gold')
      return interaction.editReply({ embeds: [embed], ephemeral: true })
    }

    const { summaryEmbed, monsterRewardEmbeds } =
      await processGlobalRaidRewards(raidBoss, globalRaidParticipants)
    // console.log(
    //   '[Raid] Global rewards processed. Final boss health:',
    //   raidBoss.current_hp,
    //   '/',
    //   raidBoss.hp
    // )
    // console.log('[Raid] Displaying end-of-raid popup with global rewards.')
    return interaction.editReply({
      embeds: [
        new EmbedBuilder(summaryEmbed.data)
          .setDescription(`This week's raid has finished.`)
          .setFooter({
            text: `Raids will restart in ${formatTimeRemaining(timeRemaining)}`,
          })
          .setColor('Gold'),
      ],
      ephemeral: true,
    })
  }

  // If the raid is active, send the welcome embed.
  const welcomeEmbed = createWelcomeEmbed(raidBoss, user)
  console.log('[Raid] Overview embed created for active raid.')

  const initialRow = createInitialActionRow(user)
  console.log('[Raid] Initial action row created.')

  await interaction.editReply({
    embeds: [welcomeEmbed],
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
      console.log('[Collector] Raid button clicked.')
      const updatedRow = createUpdatedActionRow(user)
      const updatedEmbed = createRaidBossEmbed(raidBoss, user)
      await i.update({
        embeds: [updatedEmbed],
        components: [updatedRow],
      })
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

      // Check the current raid phase from the global rotation.
      if (!rewardsDistributed) {
        // Case 1: Raid is over (cooldown phase), regardless of individual win/loss.
        if (raidBossRotation.phase !== 'active') {
          rewardsDistributed = true
          console.log(
            '[Collector] Raid is no longer active. Processing global rewards.'
          )
          const { summaryEmbed, monsterRewardEmbeds } =
            await processGlobalRaidRewards(raidBoss, globalRaidParticipants)
          summaryEmbed.setTitle("This week's Raid is over.")
          console.log(
            '[Collector] Global rewards processed. Displaying summary embed.'
          )
          await i.followUp({
            embeds: [summaryEmbed, ...monsterRewardEmbeds],
            ephemeral: true,
          })
        }
        // Case 2: Raid is still active and the player managed to defeat the boss.
        else if (playerWins) {
          rewardsDistributed = true
          console.log(
            '[Collector] Player won while raid is active. Entering cooldown early.'
          )
          await enterCooldownEarly()

          const raidProgressPercentage = 1 - raidBoss.current_hp / raidBoss.hp
          console.log(`[DEBUG] Raid Progress: ${raidProgressPercentage * 100}%`)

          let baseRewards = getUniformBaseRewards(true, raidProgressPercentage)
          let gearReward = getUniformGearReward(true, raidProgressPercentage)
          let cardRewards = getUniformCardRewards(
            true,
            raidProgressPercentage,
            raidBoss
          )

          user.gold = Number(user.gold) || 0
          user.currency = {
            ...user.currency,
            gear: Number(user.currency.gear) || 0,
          }

          user.gold += baseRewards.gold
          user.currency.gear += gearReward
          await user.setDataValue('currency', user.currency)
          await user.save()

          let monsterRewardEmbeds = []
          for (const cardName of cardRewards) {
            const monster = await pullSpecificMonster(cardName)
            if (monster) {
              await updateOrAddMonsterToCollection(user.user_id, monster)
              await updateTop3AndUserScore(user.user_id)

              const stars = getStarsBasedOnColor(monster.color)
              const category = classifyMonsterType(monster.type)
              const monsterEmbed = generateMonsterRewardEmbed(
                monster,
                category,
                stars
              )
              monsterRewardEmbeds.push(monsterEmbed)
            }
          }

          const rewardEmbed = new EmbedBuilder()
            .setTitle('🏆 Raid Rewards')
            .setDescription(
              `You received:\n\n` +
                `**Gold:** ${baseRewards.gold}\n` +
                `**Legendary Card:** ${
                  baseRewards.legendaryCard ? 'Yes' : 'No'
                }\n` +
                `**⚙️ Gear:** ${gearReward}\n` +
                `**Cards:** ${
                  cardRewards.length ? cardRewards.join(', ') : 'None'
                }`
            )
            .setColor('Green')

          const embedsToSend = [rewardEmbed, ...monsterRewardEmbeds]
          console.log(
            '[Collector] Displaying individual rewards embed to user.'
          )
          await i.followUp({ embeds: embedsToSend, ephemeral: true })
        }
      }
      // Otherwise, if the player lost their battle while the raid is still active…
      if (!playerWins && raidBossRotation.phase === 'active') {
        const defeatEmbed = new EmbedBuilder()
          .setTitle('💀 Defeat!')
          .setDescription(
            'Uh oh. Don’t worry, you can heal by spending tokens or waiting for your health to recharge.'
          )
          .setColor('Red')
          .setFooter({ text: getUserFooter(user) })
        console.log(
          '[Collector] Player lost the battle. Displaying defeat embed.'
        )
        await i.followUp({ embeds: [defeatEmbed], ephemeral: true })
      }

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

  if (user.currency.tokens < 10) {
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
    // Optionally, return early if no healing is needed.
  } else if (healType === 'max') {
    tokensSpent = Math.min(Math.ceil(missingHP / 10), user.currency.tokens)
    user.current_raidHp = user.score
    console.log(
      `[Heal] Healing to max. Healing ${missingHP} HP. Tokens spent: ${tokensSpent}`
    )
  } else {
    const desiredHeal = 100
    const healingAmount = Math.min(desiredHeal, missingHP)
    tokensSpent = Math.ceil(healingAmount / 10)
    user.current_raidHp += healingAmount
    console.log(
      `[Heal] Healing by ${healingAmount} HP. Tokens spent: ${tokensSpent}`
    )
  }

  // Subtract the tokens spent.
  user.currency = {
    ...user.currency,
    tokens: user.currency.tokens - tokensSpent,
  }
  await user.save()

  const updatedEmbed = createRaidBossEmbed(raidBoss, user)
  console.log('[Heal] Updated embed after healing created.')

  // Recreate the action row with updated user data.
  const updatedActionRow = createInitialActionRow(user)

  try {
    await interaction.editReply({
      embeds: [updatedEmbed],
      components: [updatedActionRow],
      ephemeral: true,
    })
  } catch (error) {
    console.error('[Heal] Failed to edit ephemeral message:', error)
    await interaction.followUp({
      embeds: [updatedEmbed],
      components: [updatedActionRow],
      ephemeral: true,
    })
  }
}

module.exports = { startRaidEncounter }
