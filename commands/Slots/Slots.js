const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} = require('discord.js')
const { User } = require('../../Models/model.js')
const { collectors, stopUserCollector } = require('../../utils/collectors')

let jackpot = 10000
const activePlayers = new Set()
const thumbnailUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/pit-fiend.jpg`
const gameStates = new Map() // Track each player's game state individually

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription(`Risk your soul at Zalathor's Table.`),

  async execute(interaction) {
    const userId = interaction.user.id
    stopUserCollector(userId) // Stop any previous collectors
    // Prevent multiple instances for the same user
    if (activePlayers.has(userId)) {
      activePlayers.delete(userId)
    }

    let userData = await User.findOne({ where: { user_id: userId } })
    if (!userData) {
      return await interaction.reply({
        content: `🎰 You need to set up your account first. Use \`/account\` to get started!`,
        ephemeral: true,
      })
    }

    if (userData.currency.tokens < 1) {
      return await interaction.reply({
        content: `🎰 You don't have enough 🧿tokens to play! It costs 1 token per game.`,
        ephemeral: true,
      })
    }

    // Mark player as active
    activePlayers.add(userId)

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`start_game_${userId}`)
        .setLabel("Let's Play (🧿1 token)")
        .setStyle('Primary')
    )

    const footerText = `Available: 🪙${userData.gold || 0} ⚡${
      userData.currency.energy || 0
    } 🧿${userData.currency.tokens || 0} 🥚${userData.currency.eggs || 0} 🧪${
      userData.currency.ichor || 0
    }`

    const explanationEmbed = new EmbedBuilder()
      .setTitle(`Zalathor's Slots! 🎰`)
      .setDescription(
        `Welcome to my game of chance. Shit's not fair, but give it a spin anyway. Advance through five stages of Hell—**Red, Blue, Green, Silver, and Gold**. Each stage increases the stakes and potential rewards.\n` +
          `- **Risk/Reward:** Grow your pot of gold with each roll, but be careful—every new roll risks losing it all. You can stop at any time to collect your winnings *(items won are never lost)*.\n` +
          `- **Jackpot:** Chance to win the 🪙grand prize on the Gold Stage! 🏆\n` +
          `- **Balor Card:** With a bit of bad luck, you might even earn me—the rarest card in Blood Hunter! *(Pit Fiend, CR: 20)*\n\n`
      )
      .setColor('Red')
      .setThumbnail(thumbnailUrl)
      .setFooter({ text: footerText })

    await interaction.reply({
      embeds: [explanationEmbed],
      components: [row],
      ephemeral: true,
    })

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (btnInteraction) =>
        btnInteraction.customId === `start_game_${userId}` &&
        btnInteraction.user.id === userId,
      time: 60000,
    })

    collector.on('collect', async (btnInteraction) => {
      collector.stop()
      await startGame(btnInteraction, userData)
    })
  },
}

async function startGame(interaction, userData) {
  const userId = interaction.user.id
  async function startGame(interaction, userData) {
    const userId = interaction.user.id

    // **ANTI-SPAM VARIABLES** (Move these here at the top level)
    const lastClickTime = new Map()
    const spamCount = new Map()
    const bannedUsers = new Map()
    const BAN_DURATION = 5 * 60 * 1000 // 5 min
    const CLICK_COOLDOWN = 400 // 400ms
    const MAX_WARNINGS = 2

    // Existing game state setup
    const gameState = {
      currentColumn: 0,
      totalGold: 0,
      running: true,
    }

    const collector = interaction.channel.createMessageComponentCollector({
      filter: async (btnInteraction) => {
        const now = Date.now()

        // **1️⃣ Check if user is banned**
        if (bannedUsers.has(userId)) {
          const banExpiration = bannedUsers.get(userId)
          if (now > banExpiration) {
            bannedUsers.delete(userId) // Unban after timeout
          } else {
            console.log(`[ANTI-SPAM] 🚨 User ${userId} is banned!`)
            return false
          }
        }

        // **2️⃣ Check for fast clicking**
        if (lastClickTime.has(userId)) {
          const lastTime = lastClickTime.get(userId)
          if (now - lastTime < CLICK_COOLDOWN) {
            spamCount.set(userId, (spamCount.get(userId) || 0) + 1)

            console.log(
              `[ANTI-SPAM] User ${userId} clicked too fast (${spamCount.get(
                userId
              )}/${MAX_WARNINGS})`
            )

            // **Temp Ban after MAX_WARNINGS**
            if (spamCount.get(userId) >= MAX_WARNINGS) {
              console.log(`[ANTI-SPAM] 🚨 TEMP BAN for user ${userId}`)
              bannedUsers.set(userId, now + BAN_DURATION)

              try {
                await btnInteraction.reply({
                  content: `⚠️ **You are temporarily banned for spamming!** Try again in 5 minutes.`,
                  ephemeral: true,
                })
              } catch (err) {
                console.log(
                  `[ANTI-SPAM] Couldn't send ban message to ${userId}.`
                )
              }

              return false
            } else {
              try {
                await btnInteraction.reply({
                  content: `⚠️ **Slow down!** Clicking too fast. (${spamCount.get(
                    userId
                  )}/${MAX_WARNINGS} warnings)`,
                  ephemeral: true,
                })
              } catch (err) {
                console.log(`[ANTI-SPAM] Couldn't send warning to ${userId}.`)
              }

              return false
            }
          }
        }

        // **Reset spam count if click is valid**
        spamCount.set(userId, 0)
        lastClickTime.set(userId, now)
        return btnInteraction.user.id === userId
      },
      time: 60000,
    })

    collectors.set(userId, collector)

    collector.on('collect', async (btnInteraction) => {
      console.log(`[Collector] Button clicked: ${btnInteraction.customId}`)

      if (btnInteraction.customId === `spin_again_${userId}`) {
        await playRound(btnInteraction)
      } else if (btnInteraction.customId === `stop_playing_${userId}`) {
        userData.gold += gameState.totalGold
        await userData.save()
        collector.stop()

        await btnInteraction.update({
          content: `You won **🪙${gameState.totalGold} gold**!`,
          components: [],
        })
      }
    })

    collector.on('end', () => {
      activePlayers.delete(userId)
    })
  }

  // Deduct token cost
  userData.currency = {
    ...userData.currency,
    tokens: userData.currency.tokens - 1,
  }
  await userData.save()
  jackpot += Math.floor(Math.random() * 6) + 5

  const gameState = {
    currentColumn: 0,
    totalGold: 0,
    running: true,
  }

  const columnData = [
    {
      title: 'Red Stage',
      color: 'Red',
      effects: [
        {
          emoji: '🎅',
          type: 'gain',
          chance: 50,
          range: [1, 3],
          message: '**Tiny Win 🎅**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '🎅',
          type: 'false_alarm',
          chance: 16,
          message: '**Near Advance!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '⚡',
          type: 'energy',
          chance: 8,
          message: '**⚡Energy Found!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f381.svg',
        },
        {
          emoji: '❄️',
          type: 'lose',
          chance: 12,
          range: [1, 3],
          message: '**Small Loss 💔**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2744.svg',
        },
        {
          emoji: '✅',
          type: 'advance',
          chance: 6,
          message: '**Advance to Next Stage! ⏩**  ',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2705.svg',
        },
        {
          emoji: '🛑',
          type: 'game_over',
          chance: 16,
          message: '**Game Over! 🛑**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f6d1.svg',
        },
      ],
    },
    {
      title: 'Blue Stage',
      color: 'Blue',
      effects: [
        {
          emoji: '🎅',
          type: 'gain',
          chance: 42,
          range: [1, 8],
          message: '**Small Win 🎅**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '🎅',
          type: 'false_alarm',
          chance: 10,
          message: '**Near Advance!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '❄️',
          type: 'lose',
          chance: 25,
          range: [1, 18],
          message: '**Medium Loss 💔**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2744.svg',
        },
        {
          emoji: '✅',
          type: 'advance',
          chance: 5,
          message: '**Advance to Next Stage! ⏩**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2705.svg',
        },
        {
          emoji: '🎄',
          type: 'nothing',
          chance: 10,
          message: '**Nothing Happens 🎄**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f384.svg',
        },
        {
          emoji: '🛑',
          type: 'game_over',
          chance: 8,
          message: '**Game Over! 🛑**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f6d1.svg',
        },
      ],
    },
    {
      title: 'Green Stage',
      color: 'Green',
      effects: [
        {
          emoji: '🎅',
          type: 'gain',
          chance: 40,
          range: [1, 13],
          message: '**Medium Win 🎅**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '🎅',
          type: 'false_alarm',
          chance: 8,
          message: '**Near Advance!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '❄️',
          type: 'lose',
          chance: 24,
          range: [1, 13],
          message: '**Large Loss 💔**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2744.svg',
        },
        {
          emoji: '✅',
          type: 'advance',
          chance: 6,
          message: '**Advance to Next Stage! ⏩**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2705.svg',
        },
        {
          emoji: '🧪',
          type: 'ichor',
          chance: 8,
          message: '**Ichor Found!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f381.svg',
        },
        {
          emoji: '🛑',
          type: 'game_over',
          chance: 14,
          message: '**Game Over! 🛑**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f6d1.svg',
        },
      ],
    },
    {
      title: 'Silver Stage',
      color: '#BCC0C0',
      effects: [
        {
          emoji: '🎅',
          type: 'gain',
          chance: 35,
          range: [1, 19],
          message: '**Big Win 🎅**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '🎅',
          type: 'false_alarm',
          chance: 5,
          message: '**Near Advance!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '❄️',
          type: 'lose',
          chance: 27,
          range: [1, 19],
          message: '**Huge Loss 💔**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2744.svg',
        },
        {
          emoji: '✅',
          type: 'advance',
          chance: 6,
          message: '**Advance to Final Stage! ⏩**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2705.svg',
        },
        {
          emoji: '🥚',
          type: 'eggs',
          chance: 9,
          message: '**Dragon Eggs!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f514.svg',
        },
        {
          emoji: '🛑',
          type: 'game_over',
          chance: 18,
          message: '**Game Over! 🛑 **',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f6d1.svg',
        },
      ],
    },
    {
      title: 'Gold Stage',
      color: 'Gold',
      effects: [
        {
          emoji: '🎅',
          type: 'gain',
          chance: 39,
          range: [1, 19],
          message: '**Massive Win 🎅**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '⭐',
          type: 'jackpot',
          chance: 5,
          message: '**⭐⭐ CONGRATULATIONS ⭐⭐**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2b50.svg',
        },
        {
          emoji: '❄️',
          type: 'lose',
          chance: 34,
          range: [1, 19],
          message: '**Major Loss 💔**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2744.svg',
        },
        {
          emoji: '👿',
          type: 'pit-fiend',
          chance: 2,
          message: `**👿 Zalathor's Card! 👿**`,
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f514.svg',
        },
        {
          emoji: '🛑',
          type: 'game_over',
          chance: 20,
          message: '**Game Over! 🛑**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f6d1.svg',
        },
      ],
    },
  ]

  // Create row buttons for user interaction
  const createRow = (totalGold) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`spin_again_${userId}`)
        .setLabel('Spin Again')
        .setStyle('Primary'),
      new ButtonBuilder()
        .setCustomId(`stop_playing_${userId}`)
        .setLabel(`Stop and collect 🪙${totalGold} gold`)
        .setStyle('Secondary')
    )

  let collector

  // Function to handle each round of the game
  const playRound = async (interactionObject, isInitial = false) => {
    const userId = interactionObject.user.id
    console.log(`[playRound] Started for user: ${userId}`)

    gameState.spinCount++ // Increment the spin count
    let effects = columnData[gameState.currentColumn].effects

    if (isInitial) {
      effects = effects.filter(
        (effect) => effect.type !== 'advance' && effect.type !== 'game_over'
      )
    }

    if (interactionObject.replied || interactionObject.deferred) {
      console.log(
        `[playRound] Skipping editReply because interaction was already handled.`
      )
      return
    }

    const roll = weightedRandom(effects)
    let message = roll.message
    console.log(`[playRound] Roll result: ${roll.type}, message: ${message}`)

    if (roll.type === 'gain') {
      const amount =
        Math.floor(Math.random() * (roll.range[1] - roll.range[0] + 1)) +
        roll.range[0]
      gameState.totalGold += amount
      message += ` You gained 🪙${amount} gold!`
    } else if (roll.type === 'lose') {
      const amount =
        Math.floor(Math.random() * (roll.range[1] - roll.range[0] + 1)) +
        roll.range[0]

      if (gameState.totalGold <= 0) {
        message += ` You have nothing more to lose!`
      } else {
        const deductedAmount = Math.min(amount, gameState.totalGold)
        gameState.totalGold -= deductedAmount
        message += ` You lost 🪙${deductedAmount} gold!`
      }
    } else if (roll.type === 'advance') {
      if (gameState.currentColumn < columnData.length - 1) {
        gameState.currentColumn++
        message += ` You advanced to the ${
          columnData[gameState.currentColumn].title
        }!`
      }
    } else if (roll.type === 'zalathor') {
      // TODO: Implement Zalathor card reward logic
    } else if (roll.type === 'game_over') {
      console.log(`[playRound] Game Over triggered for user: ${userId}`)
      jackpot += Math.max(Math.floor(gameState.totalGold / 2), 0)
      gameState.running = false
      activePlayers.delete(userId)
      message += ` You lost your pot of 🪙**${gameState.totalGold} gold**.`
      gameState.totalGold = 0
      // Only call stop() if collector exists.
      if (typeof collector !== 'undefined' && collector) {
        collector.stop()
      }
    } else if (roll.type === 'energy') {
      if (userData.currency.energy < 15) {
        userData.currency = {
          ...userData.currency,
          energy: userData.currency.energy + 1,
        }
        await userData.save()
        message += ` You gained ⚡energy!`
      } else {
        message += ` Sorry, your energy is already full.`
      }
    } else if (roll.type === 'eggs') {
      userData.currency = {
        ...userData.currency,
        eggs: userData.currency.eggs + 1,
      }
      await userData.save()
      message += ` You gained 🥚1 dragon egg!`
    } else if (roll.type === 'ichor') {
      userData.currency = {
        ...userData.currency,
        ichor: userData.currency.ichor + 3,
      }
      await userData.save()
      message += ` You found 🧪3 ichor!`
    } else if (roll.type === 'jackpot') {
      userData.gold += jackpot
      await userData.save()
      gameState.running = false
      gameState.totalGold = 0
      activePlayers.delete(userId)
      message += ` You won the JACKPOT of 🪙${jackpot} gold!`
      jackpot = 1000 // Reset the jackpot
    }

    const footerText = `Current Jackpot 🪙${jackpot}`

    const zalathorPhrases = [
      `Did you know I can grant wishes.`,
      `The whispers say you’ll win… but I wouldn’t trust them.`,
      `How pitiful. Spin again, maybe you’ll amuse me.`,
      `Double down. I promise, it's safe...`,
      `Somewhere, someone is winning BIG! But not you.`,
      `Ah, the Gold Stage… so many possibilities... if you ever get there.`,
      `I saw a player win the jackpot once. They disappeared right after.`,
      `You should stop now!`,
      `Gold, eggs, ichor… Does any of it matter? You'll suffer either way.`,
      `There’s a hidden button in this game… but you’re not ready for it.`,
      `Yawn.`,
      `If you leave now, you might just escape my curse… maybe.`,
      `TRA LA LA! …What? Can't a demon have fun?`,
      `I heard you can win legendary cards here. Just keep playing...`,
      `The more you play, the greater the jackpot.`,
      `This game is fair. Trust me.`,
      `My son won once, so I killed him. He's still around here... somewhere.`,
      `You've come so far. Just a little more…`,
      `Your odds are fantastic! Would I lie to you?`,
      `You're so close to winning my card! Oh… never mind.`,
      `Spin again! You're definitely hitting the jackpot this time.`,
      `The Gold Stage? Ah, that’s just a myth. No one gets there.`,
      `I bet you didn’t know that I devour the souls of quitters.`,
      `Another round?`,
    ]

    const shouldShowPhrase =
      Math.random() < 1 / (5 + Math.floor(Math.random() * 6))

    const randomPhrase = shouldShowPhrase
      ? zalathorPhrases[Math.floor(Math.random() * zalathorPhrases.length)]
      : null

    console.log(
      `[playRound] Updated gameState: totalGold=${gameState.totalGold}, currentColumn=${gameState.currentColumn}`
    )

    const embed = new EmbedBuilder()
      .setTitle(columnData[gameState.currentColumn].title)
      .setColor(columnData[gameState.currentColumn].color)
      .setDescription(
        randomPhrase ? `${message}\n\n*${randomPhrase}*\n` : message
      )
      .setThumbnail(thumbnailUrl)
      .setFooter({ text: footerText })

    // Ensure interaction is replied or deferred before updating
    if (!interactionObject.deferred && !interactionObject.replied) {
      console.log(`[playRound] Deferring update for user: ${userId}`)
      await interactionObject.deferUpdate()
    }

    if (!gameState.running) {
      activePlayers.delete(userId)

      const gameOverRowDisabled = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`play_again_${userId}`)
          .setLabel('Play Again')
          .setStyle('Success')
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`finish_${userId}`)
          .setLabel('Finish')
          .setStyle('Danger')
          .setDisabled(true)
      )
      console.log(`[playRound] Editing reply for user: ${userId}`)
      await interactionObject.editReply({
        embeds: [embed],
        components: [gameOverRowDisabled],
      })

      // Wait 1.5 seconds before enabling the buttons
      setTimeout(async () => {
        const gameOverRowEnabled = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`play_again_${userId}`)
            .setLabel('Play Again')
            .setStyle('Success'),
          new ButtonBuilder()
            .setCustomId(`finish_${userId}`)
            .setLabel('Finish')
            .setStyle('Danger')
        )

        await interactionObject.editReply({
          components: [gameOverRowEnabled],
        })

        await handlePlayAgain(interactionObject)
      }, 1500) // 1.5s delay before enabling buttons

      return
    }

    // **Disable buttons every 8 spins**
    if (gameState.spinCount % 8 === 0) {
      console.log(
        `[playRound] Spin count ${gameState.spinCount}, disabling buttons for 2 seconds.`
      )

      await interactionObject.editReply({
        embeds: [embed],
        components: [createRow(gameState.totalGold, true)], // Disable buttons
      })

      setTimeout(async () => {
        console.log(`[playRound] Re-enabling buttons after 2 seconds.`)
        await interactionObject.editReply({
          embeds: [embed],
          components: [createRow(gameState.totalGold, false)], // Re-enable buttons
        })
      }, 2000)
    } else {
      await interactionObject.editReply({
        embeds: [embed],
        components: [createRow(gameState.totalGold, false)], // Keep buttons enabled
      })
    }
  }

  await playRound(interaction, true)

  collector = interaction.channel.createMessageComponentCollector({
    filter: (btnInteraction) => btnInteraction.user.id === userId,
    time: 60000,
  })

  collectors.set(userId, collector)

  collector.on('collect', async (btnInteraction) => {
    console.log(
      `[Collector] Button pressed by ${btnInteraction.user.id}: ${btnInteraction.customId}`
    )

    try {
      if (btnInteraction.customId === `spin_again_${userId}`) {
        console.log(`[Collector] Processing 'spin_again' for user: ${userId}`)

        // Get or initialize user-specific game state
        if (!gameStates.has(userId)) {
          gameStates.set(userId, { running: false })
        }

        const userGameState = gameStates.get(userId)

        // Prevent multiple executions
        if (userGameState.running) {
          console.log(
            `[Collector] Skipping 'spin_again' because gameState.running is already true.`
          )

          if (!btnInteraction.deferred && !btnInteraction.replied) {
            await btnInteraction.deferUpdate()
          }
          return
        }

        userGameState.running = true

        try {
          await playRound(btnInteraction)
        } catch (error) {
          console.error(
            `[Collector] Error running playRound for user ${userId}: ${error}`
          )
        }

        console.log(
          `[Collector] Resetting gameState.running for user: ${userId}`
        )
        userGameState.running = false
      } else if (btnInteraction.customId === `stop_playing_${userId}`) {
        console.log(`[Collector] Processing 'stop_playing' for user: ${userId}`)

        userData.gold += gameState.totalGold
        await userData.save()
        activePlayers.delete(userId)
        collector.stop()

        console.log(
          `[Collector] User ${userId} stopped playing with totalGold: ${gameState.totalGold}`
        )

        const footerText = `Available: 🪙${userData.gold || 0} ⚡${
          userData.currency.energy || 0
        } 🧿${userData.currency.tokens || 0} 🥚${
          userData.currency.eggs || 0
        } 🧪${userData.currency.ichor || 0}`

        const finalEmbed = new EmbedBuilder()
          .setTitle(`Zalathor's Table Results 🎰`)
          .setDescription(
            `Congrats! You walked away with **🪙${gameState.totalGold} gold**.`
          )
          .setFooter({ text: footerText })
          .setColor('Green')

        console.log(
          `[Collector] Updating interaction with final results for user: ${userId}`
        )
        await btnInteraction.update({
          embeds: [finalEmbed],
          components: [],
        })
      }
    } catch (error) {
      console.error(
        `[Collector] Error in collector for user ${userId}: ${error}`
      )
      collector.stop()
    }
  })

  collector.on('end', async () => {
    console.log(`[Collector] Collector ended for user: ${userId}`)
    activePlayers.delete(userId)

    if (!interaction.replied && !interaction.deferred) {
      console.log(`[Collector] Sending timeout message for user: ${userId}`)
      await interaction.editReply({
        content: `⏳ Time's up! Your game has ended. You can play again in **1 minute.**`,
        components: [],
      })
    } else {
      console.log(
        `[Collector] Skipped timeout message because interaction was already acknowledged.`
      )
    }
  })
}

async function handlePlayAgain(interaction) {
  const userId = interaction.user.id

  const restartCollector = interaction.channel.createMessageComponentCollector({
    filter: (i) =>
      (i.customId === `play_again_${userId}` ||
        i.customId === `finish_${userId}`) &&
      i.user.id === userId,
    time: 30000, // ⏳ Timeout: 30 seconds
  })

  restartCollector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.customId === `play_again_${userId}`) {
      activePlayers.delete(userId)
      restartCollector.stop('restart')

      // **Check if Player Has Enough Tokens**
      const freshUserData = await User.findOne({ where: { user_id: userId } })
      if (!freshUserData || freshUserData.currency.tokens < 1) {
        await buttonInteraction.reply({
          content: `❌ You need at least 1 🧿token to play again!`,
          ephemeral: true,
        })
        return
      }

      await module.exports.execute(buttonInteraction)
    } else if (buttonInteraction.customId === `finish_${userId}`) {
      restartCollector.stop('finished')
      const finishEmbed = new EmbedBuilder()
        .setTitle('Thanks for Playing! 🎰')
        .setDescription('*Giving up so soon? Come back anytime.*')
        .setColor('DarkRed')
        .setThumbnail(thumbnailUrl)

      await buttonInteraction.update({
        embeds: [finishEmbed],
        components: [], // Remove buttons
      })
    }
  })

  restartCollector.on('end', async (_, reason) => {
    if (reason === 'time') {
      await interaction.editReply({ components: [] })
    }
  })
}

function weightedRandom(effects) {
  const totalWeight = effects.reduce((sum, effect) => sum + effect.chance, 0)
  const random = Math.random() * totalWeight
  let cumulative = 0

  for (const effect of effects) {
    cumulative += effect.chance
    if (random < cumulative) return effect
  }
}
