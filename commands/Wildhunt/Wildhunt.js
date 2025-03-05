const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js')
const { Monster, User, Collection } = require('../../Models/model.js')
const { checkUserAccount } = require('../Account/checkAccount.js')
const { populateMonsterCache } = require('../../handlers/cacheHandler')
const { collectors, stopUserCollector } = require('../../utils/collectors')
const { runBattlePhases } = require('../Hunt/huntUtils/battleHandler.js') // Adjust path if necessary
const { verifyAndUpdateUserScores } = require('../../utils/verifyUserScores.js')

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
async function setupRewardWheel(rewardMessage, user, timeout = 30000) {
  console.log('[RewardWheel] Setting up reward wheel.')
  const rewards = [800, 800, 1000, 1200, 2000, 3000, 4000, 5000]
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣']
  // Shuffle rewards.
  for (let i = rewards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rewards[i], rewards[j]] = [rewards[j], rewards[i]]
  }

  const filter = (reaction, userReacting) => {
    return emojis.includes(reaction.emoji.name) && !userReacting.bot
  }

  const collector = rewardMessage.createReactionCollector({
    filter,
    time: timeout,
  })
  let rewardClaimed = false

  collector.on('collect', async (reaction, reactingUser) => {
    console.log('[RewardWheel] Reaction collected:', reaction.emoji.name)
    rewardClaimed = true
    const index = emojis.indexOf(reaction.emoji.name)
    const selectedReward = rewards[index]
    const userData = await User.findOne({ where: { user_id: reactingUser.id } })
    if (userData) {
      userData.gold = (userData.gold || 0) + selectedReward
      await userData.save()
      console.log(
        `[RewardWheel] Awarded ${selectedReward} gold to user ${reactingUser.id}`
      )
    }
    const feedbackEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Congratulations!')
      .setDescription(
        `${reactingUser.username}, you selected ${reaction.emoji.name} and won 🪙${selectedReward} gold!`
      )
    await rewardMessage.edit({ content: ' ', embeds: [feedbackEmbed] })
    await rewardMessage.reactions.removeAll().catch(console.error)
    collector.stop()
  })

  collector.on('end', async () => {
    if (!rewardClaimed) {
      console.log('[RewardWheel] No reward was claimed.')
      await rewardMessage
        .edit({
          content: 'No reward selected. Proceeding to the next set of battles.',
          embeds: [],
        })
        .catch(console.error)
      await rewardMessage.reactions.removeAll().catch(console.error)
    }
  })

  for (const emoji of emojis) {
    await rewardMessage.react(emoji)
  }
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
    // For debugging, ephemeral is set to false.
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: false })
      console.log('[WildHunt] Reply deferred.')
    }
    const user = await checkUserAccount(interaction)
    if (!user) {
      console.log('[WildHunt] No user account found.')
      return
    }
    stopUserCollector(interaction.user.id)
    await verifyAndUpdateUserScores(user.user_id)
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
      // New session: set cooldown to now + 24h and reset buy-ins to 0.
      user.lastWildHuntAvailable = new Date(now + 24 * 3600000)
      user.wildHuntBuyInsUsed = 0
      console.log(
        '[WildHunt] New session started. Cooldown set to',
        user.lastWildHuntAvailable
      )
      await user.save()
      // Build welcome embed for active session.
      const welcomeEmbed = new EmbedBuilder()
        .setTitle('Wild Hunt')
        .setDescription(
          'Prepare to face a ladder of beasts! Click **Begin Wild Hunt** to start, or **Cancel Wild Hunt** to abort.'
        )
        .setColor('DarkGreen')
        .setFooter({
          text: `Your Brute Score: ${user.brute_score || 0} + Base Damage: ${
            user.base_damage || 0
          }`,
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
        ephemeral: false,
      })
    } else {
      if (user.wildHuntBuyInsUsed >= 4) {
        console.log('[WildHunt] All daily buy-ins used.')
        replyMessage = await interaction.editReply({
          content: `Wild Hunt is on cooldown until ${new Date(
            user.lastWildHuntAvailable
          ).toLocaleString()}. You have used all 4 daily buy-ins.`,
          ephemeral: false,
        })
        // Attach temporary collector.
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
      const cost = user.wildHuntBuyInsUsed * 1500
      const remainingMs = new Date(user.lastWildHuntAvailable).getTime() - now
      const countdown = formatTimeRemaining(remainingMs)
      const footerText = `Wild Hunt available in ${countdown}. Buy-ins used: ${user.wildHuntBuyInsUsed}/4.`
      const cooldownEmbed = new EmbedBuilder()
        .setTitle('Wild Hunt - Cooldown')
        .setDescription(
          `Wild Hunt is on cooldown. You can purchase a buy-in for **${cost} gold** to play now.`
        )
        .setColor('DarkOrange')
        .setFooter({ text: footerText })
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
        ephemeral: false,
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
        ephemeral: false,
      })
    }
    let currentIndex = 0
    let winsInSet = 0
    const effectivePlayerScore =
      (user.brute_score || 0) + (user.base_damage || 0)

    async function runWildHunt() {
      console.log('[WildHunt] Running wild hunt loop.')
      while (true) {
        if (winsInSet >= 5) {
          console.log('[WildHunt] 5 wins reached; triggering reward wheel.')
          const rewardEmbed = new EmbedBuilder()
            .setTitle('Reward Wheel')
            .setDescription(
              'React with a number emoji (1️⃣ - 8️⃣) to claim your gold reward!'
            )
            .setColor('Gold')
          const rewardMessage = await interaction.followUp({
            embeds: [rewardEmbed],
            ephemeral: false,
            fetchReply: true,
          })
          await setupRewardWheel(rewardMessage, user, 30000)
          await interaction.followUp({
            content: 'Reward claimed! Continuing the Wild Hunt...',
            ephemeral: false,
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
          effectivePlayerScore,
          battleBoss.boss_score,
          battleBoss,
          1, // advMultiplier fixed to 1.
          { ichorUsed: false },
          'Brute',
          beast.imageUrl || null // Pass the wildhunt-specific image URL if available.
        );
        
        if (battleResult) {
          winsInSet++
          currentIndex++
          console.log(
            `[WildHunt] Victory over ${beast.name}. Wins in set: ${winsInSet}`
          )
          await interaction.followUp({
            content: `Victory over **${beast.name}**! (${winsInSet}/5 wins in this set)`,
            ephemeral: false,
          })
          await new Promise((res) => setTimeout(res, 2000))
        } else {
          console.log(`[WildHunt] Defeat by ${beast.name}. Ending hunt.`)
          await interaction.followUp({
            content: `You were defeated by **${beast.name}**. The Wild Hunt ends here.`,
            ephemeral: false,
          })
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
        user.lastWildHuntAvailable = new Date(Date.now() + 24 * 3600000)
        await user.save()
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
        const cost = user.wildHuntBuyInsUsed * 1500 // first buy-in free when count is 0.
        console.log(
          `[WildHunt] Purchase cost: ${cost}. User gold: ${user.gold}`
        )
        if (user.gold < cost) {
          console.log('[WildHunt] Not enough gold for buy-in.')
          try {
            await i.followUp({
              content: `You don't have enough gold for a buy-in (cost: ${cost}).`,
              ephemeral: false,
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
        await user.save()
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
            text: `Wild Hunt available in ${countdown}. Buy-ins used: ${user.wildHuntBuyInsUsed}/4`,
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
        runWildHunt()
      }
    })

    collector.on('end', async (_, reason) => {
      console.log(`[WildHunt] Collector ended with reason: ${reason}`)
      collectors.delete(interaction.user.id)
      if (reason === 'time') {
        await interaction.followUp({
          content: 'Wild Hunt session expired. Please try again.',
          ephemeral: false,
        })
      }
    })
  },
}
