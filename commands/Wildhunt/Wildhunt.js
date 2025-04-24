const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js')
const { Monster } = require('../../Models/model.js')
const { checkUserAccount } = require('../Account/helpers/checkAccount.js')
const { populateMonsterCache } = require('../../handlers/cacheHandler')

const { runBattlePhases } = require('../Hunt/huntUtils/battleHandler.js') // Adjust path if necessary
const { verifyAndUpdateUserScores } = require('../../utils/verifyUserScores.js')

const {
  updateOrAddMonsterToCollection,
} = require('../../handlers/userMonsterHandler')
const { updateTop3AndUserScore } = require('../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../utils/starRating')
const { classifyMonsterType } = require('../Hunt/huntUtils/huntHelpers.js')

const { collectors, stopUserCollector } = require('../../utils/collectors')

// Utility function to format time remaining as a countdown.
function formatTimeRemaining(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days}d:${hours}h:${minutes}m:${seconds}s`
}

// ---------------- Reward Wheel Setup ---------------- //
async function setupRewardWheel(interaction, user, timeout = 30000) {
  return new Promise(async (resolve) => {
    const rewards = [
      { type: 'gold', amount: 450 },
      { type: 'gold', amount: 450 },
      { type: 'gear', min: 3, max: 6 },
      { type: 'gear', min: 5, max: 8 },
      { type: 'beast' },
    ]

    rewards.sort(() => Math.random() - 0.5)

    const rewardButtons = new ActionRowBuilder().addComponents(
      rewards.map((_, index) =>
        new ButtonBuilder()
          .setCustomId(`reward_choice_${index}`)
          .setLabel(`Door ${index + 1}`)
          .setStyle(ButtonStyle.Primary)
      )
    )

    const rewardEmbed = new EmbedBuilder()
      .setTitle('🎡 Reward Wheel')
      .setDescription('Choose a door below to claim your reward!')
      .setColor('Gold')

    const rewardMessage = await interaction.followUp({
      embeds: [rewardEmbed],
      components: [rewardButtons],
      ephemeral: true,
      fetchReply: true,
    })

    const collector = rewardMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: timeout,
      max: 1,
    })

    let claimed = false

    collector.on('collect', async (i) => {
      claimed = true
      await i.deferUpdate()

      const selectedReward = rewards[parseInt(i.customId.split('_')[2])]

      let resultEmbed

      if (selectedReward.type === 'gold') {
        await user.increment('gold', { by: selectedReward.amount })

        resultEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🎉 Congratulations!')
          .setDescription(
            `${i.user.username}, you've won 🪙${selectedReward.amount} gold!`
          )
      } else if (selectedReward.type === 'gear') {
        await user.increment('gold', { by: 225 })
        
        const gearReward =
          Math.floor(
            Math.random() * (selectedReward.max - selectedReward.min + 1)
          ) + selectedReward.min
        user.currency.gear = (user.currency.gear || 0) + gearReward
        await user.changed('currency', true)
        await user.save()

        resultEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🎉 Congratulations!')
          .setDescription(
            `${i.user.username}, you've won 🪙180 gold and ⚙️${gearReward} gear!`
          )
      } else if (selectedReward.type === 'beast') {
        await user.increment('gold', { by: 225 })     
        const beasts = await Monster.findAll({ where: { type: 'beast' } })
        if (beasts.length > 0) {
          const beast = beasts[Math.floor(Math.random() * beasts.length)]
          await updateOrAddMonsterToCollection(user.user_id, beast)
          await updateTop3AndUserScore(user.user_id)

          const stars = getStarsBasedOnColor(beast.color)
          const category = classifyMonsterType(beast.type)
          resultEmbed = generateMonsterRewardEmbed(beast, category, stars)
          resultEmbed.setDescription(
            `${i.user.username} obtained 🪙180 gold and ${
              beast.name
            } from their Wild Hunt!\n\n${resultEmbed.data.description || ''}`
          )
        } else {
          resultEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Reward Error')
            .setDescription('No beast cards available.')
        }
      }

      // Send non-ephemeral result to channel
      await interaction.channel.send({ embeds: [resultEmbed] })

      resolve(true)
    })

    collector.on('end', async () => {
      if (!claimed) {
        await interaction.followUp({
          content: '⏳ Time expired! No reward was selected.',
          ephemeral: true,
        })
      }
    })
  })
}

// ---------------- Beast Ladder Generation ---------------- //
async function getBeastLadder() {
  console.log('[WildHunt] Retrieving beast ladder.')
  const beasts = await Monster.findAll({
    where: { type: 'beast' },
    order: [['cr', 'ASC']],
  })
  if (!beasts || beasts.length === 0) return []
  const groups = {}
  for (const beast of beasts) {
    const cr = beast.cr
    if (!groups[cr]) groups[cr] = []
    groups[cr].push(beast)
  }
  const ladder = []
  const sortedCRs = Object.keys(groups).sort((a, b) => a - b)
  for (const cr of sortedCRs) {
    const group = groups[cr]
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[group[i], group[j]] = [group[j], group[i]]
    }
    ladder.push(...group)
  }
  console.log('[WildHunt] Ladder constructed with', ladder.length, 'beasts.')
  return ladder
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wildhunt')
    .setDescription('Embark on a Wild Hunt against a ladder of beasts.'),
  async execute(interaction) {
    console.log('[WildHunt] Command executed.')
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true })
      console.log('[WildHunt] Reply deferred.')
    }
    const user = await checkUserAccount(interaction)
    if (!user) {
      console.log('[WildHunt] No user account found.')
      return
    }
    stopUserCollector(interaction.user.id)
    await verifyAndUpdateUserScores(user.user_id)
    await user.reload()

    // ── use the fresh values from here on ──
    const bruteScore = user.brute_score || 0

    await populateMonsterCache()

    // ------------- Cooldown & Buy-In Logic ------------- //
    const now = Date.now()
    let onCooldown = false
    if (
      user.lastWildHuntAvailable &&
      new Date(user.lastWildHuntAvailable).getTime() > now
    ) {
      onCooldown = true
      console.log('[WildHunt] User is on cooldown.')
    }
    let replyMessage
    if (!onCooldown) {
      // When not on cooldown, do not set the cooldown date yet—only reset buy-ins.
      user.wildHuntBuyInsUsed = 0
      await user.save()
      // Build welcome embed for active session.
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('Wild Hunt!')
        .setDescription(
          `To win, climb the ladder of beasts and reach the top of the food chain using only your **brute strength**. Each round consists of 5 fights and comes with the chance to win gold, gear, and beast cards.
      
Your Brute Score: ${bruteScore || 0} + Base Damage: ${baseDmg || 0}`
        )
        .setColor('DarkGreen')
        .setFooter({
          text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
        })

      const normalRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('begin_wildhunt')
          .setLabel('Begin Wild Hunt')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_wildhunt')
          .setLabel('Cancel Wild Hunt')
          .setStyle(ButtonStyle.Danger)
      )
      console.log('[WildHunt] Sending welcome embed.')
      replyMessage = await interaction.editReply({
        embeds: [welcomeEmbed],
        components: [normalRow],
        ephemeral: true,
      })
    } else {
      if (user.wildHuntBuyInsUsed >= 4) {
        console.log('[WildHunt] All daily buy-ins used.')
        replyMessage = await interaction.editReply({
          content: `Wild Hunt is on cooldown until ${new Date(
            user.lastWildHuntAvailable
          ).toLocaleString()}. You have used all 4 daily buy-ins.`,
          ephemeral: true,
        })
        const tempCollector = replyMessage.createMessageComponentCollector({
          filter: (i) => i.user.id === interaction.user.id,
          time: 60000,
        })
        tempCollector.on('collect', async (i) => {
          console.log('[WildHunt] In cooldown - button pressed:', i.customId)
          if (i.customId === 'cancel_wildhunt') {
            if (!i.deferred) await i.deferUpdate()
            await i.editReply({
              content: 'Wild Hunt cancelled.',
              components: [],
              embeds: [],
            })
            tempCollector.stop()
          }
        })
        return
      }
      const cost = (user.wildHuntBuyInsUsed + 1) * 1500
      const remainingMs = new Date(user.lastWildHuntAvailable).getTime() - now
      const countdown = formatTimeRemaining(remainingMs)
      const cooldownEmbed = new EmbedBuilder()
        .setTitle('Wild Hunt - Cooldown')
        .setDescription(
          `Wild Hunt available in \`${countdown}\`. Buy-ins used: ${user.wildHuntBuyInsUsed}/4.`
        )
        .setFooter({
          text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
        })

      const buyinRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('begin_wildhunt')
          .setLabel('Begin Wild Hunt')
          .setStyle(ButtonStyle.Success)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('purchase_buyin')
          .setLabel(`Purchase Buy-In (${cost} gold)`)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('cancel_wildhunt')
          .setLabel('Cancel Wild Hunt')
          .setStyle(ButtonStyle.Danger)
      )
      console.log('[WildHunt] Sending cooldown embed.')
      replyMessage = await interaction.editReply({
        embeds: [cooldownEmbed],
        components: [buyinRow],
        ephemeral: true,
      })
    }

    // Attach collector to the reply message.
    const filter = (i) => i.user.id === interaction.user.id
    const collector = replyMessage.createMessageComponentCollector({
      filter,
      time: 60000,
    })
    collectors.set(interaction.user.id, collector)

    // Wild Hunt battle loop state.
    let beastLadder = await getBeastLadder()
    if (beastLadder.length === 0) {
      console.log('[WildHunt] No beasts found.')
      return interaction.editReply({
        content: 'No beasts available for Wild Hunt.',
        ephemeral: true,
      })
    }
    let currentIndex = 0
    let winsInSet = 0

    async function runWildHunt() {
      console.log('[WildHunt] Running wild hunt loop.')
      while (true) {
        if (winsInSet >= 5) {
          console.log('[WildHunt] 5 wins reached; triggering reward wheel.')
          const rewardWheelEmbed = new EmbedBuilder()
            .setTitle('Reward Wheel')
            .setDescription(
              'React with a number emoji (1️⃣ - 5️⃣) to claim your prize!'
            )
            .setColor('Gold')
          const rewardMessage = await interaction.followUp({
            embeds: [rewardWheelEmbed],
            ephemeral: false,
            fetchReply: true,
          })

          // Await the reward selection before continuing.
          await setupRewardWheel(interaction, user, 30000)

          const rewardClaimedEmbed = new EmbedBuilder()
            .setTitle('Reward Wheel')
            .setColor('Gold')
            .setDescription(
              'Reward selection complete! Continuing the Wild Hunt...'
            )
          await interaction.followUp({
            embeds: [rewardClaimedEmbed],
            ephemeral: true,
          })

          winsInSet = 0
          if (currentIndex >= beastLadder.length) {
            beastLadder = await getBeastLadder()
            currentIndex = 0
          }
          continue
        }
        if (currentIndex >= beastLadder.length) {
          beastLadder = await getBeastLadder()
          currentIndex = 0
        }
        const beast = beastLadder[currentIndex]
        const setIndex = Math.floor(currentIndex / 5)
        const lowerBound = 50 + setIndex * 100
        const upperBound = 100 + setIndex * 100
        const mScore =
          Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound
        const thumbnailUrl =
          beast.imageUrl ||
          'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/default.png'
        const battleBoss = {
          index: beast.id,
          name: beast.name,
          cr: beast.cr,
          boss_score: mScore,
          hp: mScore,
          current_hp: mScore,
          thumbnailUrl: thumbnailUrl,
        }
        console.log(
          `[WildHunt] Battling beast: ${beast.name} with mScore ${mScore}, url ${beast.imageUrl}`
        )

        const battleResult = await runBattlePhases(
          interaction,
          user,
          bruteScore,
          battleBoss.boss_score,
          battleBoss,
          1, // advMultiplier fixed to 1.
          { ichorUsed: false },
          'Brute',
          beast.imageUrl || null // Pass the wildhunt-specific image URL if available.
        )

        if (battleResult) {
          winsInSet++
          currentIndex++
          const victoryEmbed = new EmbedBuilder()
            .setTitle('Victory!')
            .setColor('Green')
            .setDescription(
              `Victory over **${beast.name}**! (${winsInSet}/5 wins in this set)`
            )
          await interaction.followUp({
            embeds: [victoryEmbed],
            ephemeral: true,
          })
          await new Promise((res) => setTimeout(res, 2000))
        } else {
          console.log(`[WildHunt] Defeat by ${beast.name}. Ending hunt.`)
          const defeatEmbed = new EmbedBuilder()
            .setTitle('Defeat')
            .setColor('Red')
            .setDescription(
              `You were defeated by **${beast.name}**. The Wild Hunt ends here.`
            )
          await interaction.followUp({
            embeds: [defeatEmbed],
            ephemeral: false,
          })
          // Only update the cooldown when the hunt completes due to defeat.
          user.lastWildHuntAvailable = new Date(Date.now() + 24 * 3600000)
          await user.save()
          collector.stop()
          return
        }
      }
    }

    collector.on('collect', async (i) => {
      console.log('[WildHunt] Collector received button:', i.customId)
      if (i.customId === 'cancel_wildhunt') {
        console.log('[WildHunt] Processing cancel button.')
        if (!i.deferred) {
          try {
            await i.deferUpdate()
          } catch (err) {
            console.error('[WildHunt] Error deferring cancel:', err)
          }
        }
        try {
          await i.editReply({
            content: 'Wild Hunt cancelled.',
            components: [],
            embeds: [],
          })
        } catch (err) {
          console.error('[WildHunt] Error editing reply on cancel:', err)
        }
        // Do NOT update lastWildHuntAvailable on cancel.
        collector.stop()
        return
      }
      if (i.customId === 'purchase_buyin') {
        console.log('[WildHunt] Processing purchase_buyin button.')
        if (!i.deferred) {
          try {
            await i.deferUpdate()
          } catch (err) {
            console.error('[WildHunt] Error deferring purchase_buyin:', err)
          }
        }
        const cost = (user.wildHuntBuyInsUsed + 1) * 1500

        console.log(
          `[WildHunt] Purchase cost: ${cost}. User gold: ${user.gold}`
        )
        if (user.gold < cost) {
          console.log('[WildHunt] Not enough gold for buy-in.')
          try {
            await i.followUp({
              content: `You don't have enough gold for a buy-in (cost: ${cost}).`,
              ephemeral: true,
            })
          } catch (err) {
            console.error(
              '[WildHunt] Error following up on purchase_buyin:',
              err
            )
          }
          return
        }
        user.gold -= cost
        user.wildHuntBuyInsUsed += 1
        // Restart the 24-hour cooldown on every purchase.
        user.lastWildHuntAvailable = new Date(Date.now() + 24 * 3600000)
        await user.save()

        // Update the embed/UI as needed.
        const remainingMs =
          new Date(user.lastWildHuntAvailable).getTime() - Date.now()
        const countdown = formatTimeRemaining(remainingMs)
        const updatedRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('begin_wildhunt')
            .setLabel('Begin Wild Hunt')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('cancel_wildhunt')
            .setLabel('Cancel Wild Hunt')
            .setStyle(ButtonStyle.Danger)
        )
        const cooldownEmbed = new EmbedBuilder()
          .setTitle('Wild Hunt - Buy-In Purchased')
          .setDescription(
            'You have purchased a buy-in. You may now begin the Wild Hunt.'
          )
          .setColor('DarkGreen')
          .setFooter({
            text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
          })
        try {
          console.log('[WildHunt] Updating reply after purchase_buyin.')
          await i.editReply({
            embeds: [cooldownEmbed],
            components: [updatedRow],
          })
        } catch (err) {
          console.error(
            '[WildHunt] Error editing reply on purchase_buyin:',
            err
          )
        }
        return
      }

      if (i.customId === 'begin_wildhunt') {
        console.log('[WildHunt] Processing begin_wildhunt button.')
        if (!i.deferred) {
          try {
            await i.deferUpdate()
          } catch (err) {
            console.error('[WildHunt] Error deferring begin_wildhunt:', err)
          }
        }
        // Update lastWildHuntAvailable only when the player actually begins the hunt.
        user.lastWildHuntAvailable = new Date(Date.now() + 24 * 3600000)
        await user.save()
        runWildHunt()
      }
    })

    collector.on('end', async (_, reason) => {
      console.log(`[WildHunt] Collector ended with reason: ${reason}`)
      collectors.delete(interaction.user.id)
      // if (reason === 'time') {
      //   await interaction.followUp({
      //     content: 'Wild Hunt session expired. Please try again.',
      //     ephemeral: true,
      //   })
      // }
    })
  },
}
