const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} = require('discord.js')
const { User } = require('../../Models/model.js')
const { collectors, stopUserCollector } = require('../../utils/collectors')

const {
  updateOrAddMonsterToCollection,
} = require('../../handlers/userMonsterHandler')
const { updateTop3AndUserScore } = require('../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../utils/starRating')
const { classifyMonsterType } = require('../Hunt/huntUtils/huntHelpers')

let jackpot = 105983
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

    const tokensOnHand = userData.currency.tokens

    const betRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder() // 1 token
        .setCustomId(`bet_1_${userId}`)
        .setLabel('🧿1')
        .setStyle('Primary')
        .setDisabled(tokensOnHand < 1),

      new ButtonBuilder() // 10 tokens
        .setCustomId(`bet_10_${userId}`)
        .setLabel('🧿10')
        .setStyle('Primary')
        .setDisabled(tokensOnHand < 10),

      new ButtonBuilder() // 25 tokens
        .setCustomId(`bet_25_${userId}`)
        .setLabel('🧿25')
        .setStyle('Primary')
        .setDisabled(tokensOnHand < 25),

      new ButtonBuilder() // 100 tokens
        .setCustomId(`bet_100_${userId}`)
        .setLabel('🧿100')
        .setStyle('Danger')
        .setDisabled(tokensOnHand < 100)
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
          `- **Balor Card:** With a bit of bad luck, you might even earn me—the rarest card in Blood Hunter! *(Pit Fiend, Base Score: 200)*\n\n`
      )
      .setColor('Red')
      .setThumbnail(thumbnailUrl)
      .setFooter({ text: footerText })

    await interaction.reply({
      embeds: [explanationEmbed],
      components: [betRow],
      ephemeral: true,
    })

    // wait for the user to press one of the four bet buttons
    const collector = interaction.channel.createMessageComponentCollector({
      filter: (btn) =>
        btn.user.id === userId &&
        /^bet_(1|10|25|100)_[0-9]+$/.test(btn.customId),
      time: 30_000, // 30-second window
    })

    collector.on('collect', async (btn) => {
      /* try to acknowledge; ignore “already acknowledged” or “unknown” errors */
      if (!btn.deferred && !btn.replied) {
        try {
          await btn.deferUpdate()
        } catch (_) {
          /* no-op */
        }
      }

      collector.stop() // close this short collector

      const stake = Number(btn.customId.split('_')[1]) // 1,10,25,100
      gameStates.set(userId, { betSize: stake })

      await startGame(btn, userData) // launch the real game
    })
  },
}

async function startGame(interaction, userData) {
  const userId = interaction.user.id

  // Deduct token cost
  const stake = gameStates.get(userId)?.betSize || 1
  if (userData.currency.tokens < stake) {
    await interaction.reply({ content: 'Not enough tokens', ephemeral: true })
    return
  }
  userData.currency = {
    ...userData.currency,
    tokens: userData.currency.tokens - stake,
  }
  jackpot += stake // keep jackpot proportional

  await userData.save()
  jackpot += Math.floor(Math.random() * 6) + 5

  // Timer initialization
  let lastInteractionTime = Date.now()

  // Game state
  let gameState = gameStates.get(userId)
  if (!gameState) {
    gameState = {
      betSize: stake,
      currentColumn: 0,
      totalGold: 0,
      running: false,
      spinCount: 0,
    }
    gameStates.set(userId, gameState)
  } else {
    gameState.betSize = stake
    gameState.currentColumn = 0
    gameState.totalGold = 0
    gameState.spinCount = 0
  }

  if (collectors.has(userId)) {
    try {
      collectors.get(userId).stop()
    } catch {}
  }

  // Column data for game rounds
  const columnData = [
    {
      title: 'Red Stage',
      color: 'Red',
      effects: [
        {
          emoji: '🍀',
          type: 'gain',
          chance: 50,
          range: [1, 3],
          message: '**Tiny Win 🍀**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '☘️',
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
          emoji: '🌷',
          type: 'lose',
          chance: 14,
          range: [1, 3],
          message: '**Small Loss 💔**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2744.svg',
        },
        {
          emoji: '✅',
          type: 'advance',
          chance: 8,
          message: '**Advance to Next Stage! ⏩**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2705.svg',
        },
        {
          emoji: '🛑',
          type: 'game_over',
          chance: 12,
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
          emoji: '🍀',
          type: 'gain',
          chance: 42,
          range: [1, 8],
          message: '**Small Win 🍀**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '☘️',
          type: 'false_alarm',
          chance: 10,
          message: '**Near Advance!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '🌷',
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
          emoji: '🍀',
          type: 'gain',
          chance: 40,
          range: [1, 13],
          message: '**Medium Win 🍀**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '☘️',
          type: 'false_alarm',
          chance: 8,
          message: '**Near Advance!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '🌷',
          type: 'lose',
          chance: 24,
          range: [1, 13],
          message: '**Large Loss 💔**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/2744.svg',
        },
        {
          emoji: '✅',
          type: 'advance',
          chance: 8,
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
          chance: 12,
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
          emoji: '🍀',
          type: 'gain',
          chance: 35,
          range: [1, 19],
          message: '**Big Win 🍀**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '☘️',
          type: 'false_alarm',
          chance: 5,
          message: '**Near Advance!**',
          link: 'https://twemoji.maxcdn.com/v/latest/svg/1f385.svg',
        },
        {
          emoji: '🌷',
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
          emoji: '🍀',
          type: 'gain',
          chance: 39,
          range: [1, 19],
          message: '**Massive Win 🍀**',
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
          emoji: '🌷',
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
  const createRow = (totalGold, disabled = false) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`spin_again_${userId}`)
        .setLabel('Spin Again')
        .setStyle('Primary')
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(`stop_playing_${userId}`)
        .setLabel(`Stop and collect 🪙${totalGold} gold`)
        .setStyle('Secondary')
        .setDisabled(disabled)
    )

  // Function to handle each round of the game
  const playRound = async (btn, isInitial = false) => {
    try {
      if (!btn.deferred && !btn.replied) await btn.deferUpdate()
    } catch {}

    gameState.spinCount++

    let effects = columnData[gameState.currentColumn].effects
    if (isInitial) {
      effects = effects.filter(
        (e) => e.type !== 'advance' && e.type !== 'game_over'
      )
    }

    const roll = weightedRandom(effects)
    let msg = roll.message
    let extraEmbeds = []

    /* ─────────── outcome branches ─────────── */
    if (roll.type === 'gain') {
      const raw =
        Math.floor(Math.random() * (roll.range[1] - roll.range[0] + 1)) +
        roll.range[0]
      const gain = Math.round(raw * 1.5 * Math.sqrt(gameState.betSize))
      gameState.totalGold += gain
      msg += ` You gained 🪙${gain} gold!`
    } else if (roll.type === 'lose') {
      const raw =
        Math.floor(Math.random() * (roll.range[1] - roll.range[0] + 1)) +
        roll.range[0]
      const bite = Math.round(raw * 1.2 * Math.sqrt(gameState.betSize))
      const lost = Math.min(bite, gameState.totalGold)
      gameState.totalGold -= lost
      msg +=
        lost > 0
          ? ` You lost 🪙${lost} gold!`
          : ` You have nothing more to lose!`
    } else if (roll.type === 'advance') {
      if (gameState.currentColumn < columnData.length - 1) {
        gameState.currentColumn++
        msg += ` You advanced to the ${
          columnData[gameState.currentColumn].title
        }!`
      }
    } else if (roll.type === 'energy') {
      if (userData.currency.energy < 15) {
        console.log('old energy: ', userData.currency.energy)
        userData.currency = {
          ...userData.currency,
          energy: userData.currency.energy + 1,
        }
        await userData.save()
        msg += ' You gained ⚡energy!'
        console.log('new energy: ', userData.currency.energy)
      } else {
        msg += ' Sorry, your energy is already full.'
      }
    } else if (roll.type === 'eggs') {
      userData.currency = {
        ...userData.currency,
        eggs: userData.currency.eggs + 1,
      }
      await userData.save()
      msg += ' You gained 🥚1 dragon egg!'
    } else if (roll.type === 'ichor') {
      userData.currency = {
        ...userData.currency,
        ichor: userData.currency.ichor + 3,
      }
      await userData.save()
      msg += ' You found 🧪3 ichor!'
      /* ====== PIT-FIEND (legendary) ====== */
    } else if (roll.type === 'pit-fiend') {
      // 1) award the card
      try {
        const monster = await Monster.findOne({ where: { index: 'pit-fiend' } })
        if (monster) {
          await updateOrAddMonsterToCollection(userId, monster)
          await updateTop3AndUserScore(userId)

          const stars = getStarsBasedOnColor(monster.color)
          const category = classifyMonsterType(monster.type)
          const cardEmbed = generateMonsterRewardEmbed(monster, category, stars)

          extraEmbeds = [cardEmbed] // declare: let extraEmbeds = [];
          msg += ' **You captured the legendary Pit Fiend card! 👿**'
        } else {
          msg += ' (Could not load Pit-Fiend card – tell the dev.)'
        }
      } catch (e) {
        console.error('[slots] pit-fiend error', e)
        msg += ' (Error awarding card – tell the dev.)'
      }

      // 2) end the game like a jackpot
      gameState.running = false
      activePlayers.delete(userId)

      const gameOverRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`play_again_${userId}`)
          .setLabel('Play Again')
          .setStyle('Success'),
        new ButtonBuilder()
          .setCustomId(`finish_${userId}`)
          .setLabel('Finish')
          .setStyle('Danger')
      )

      const embed = new EmbedBuilder()
        .setTitle(columnData[gameState.currentColumn].title)
        .setColor(columnData[gameState.currentColumn].color)
        .setDescription(msg)
        .setThumbnail(thumbnailUrl)
        .setFooter({ text: `Current Jackpot 🪙${jackpot}` })

      await btn.editReply({
        embeds: [embed, ...extraEmbeds],
        components: [gameOverRow],
      })
      await handlePlayAgain(btn)
      return
    } else if (roll.type === 'jackpot') {
      userData.gold += jackpot
      await userData.save()
      gameState.running = false
      gameState.totalGold = 0
      activePlayers.delete(userId)
      msg += `You won the JACKPOT of 🪙${jackpot} gold!`
      jackpot = 100000 // Reset the jackpot
      // await saveJackpot(jackpot)
    } else if (roll.type === 'game_over') {
      jackpot += Math.max(Math.floor(gameState.totalGold / 2), 0)
      gameState.running = false
      activePlayers.delete(userId)
      msg += ` You lost your pot of 🪙${gameState.totalGold} gold.`
      gameState.totalGold = 0

      /* Play-again row */
      const gameOverRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`play_again_${userId}`)
          .setLabel('Play Again')
          .setStyle('Success'),
        new ButtonBuilder()
          .setCustomId(`finish_${userId}`)
          .setLabel('Finish')
          .setStyle('Danger')
      )

      const embed = new EmbedBuilder()
        .setTitle(columnData[gameState.currentColumn].title)
        .setColor(columnData[gameState.currentColumn].color)
        .setDescription(msg)
        .setThumbnail(thumbnailUrl)
        .setFooter({ text: `Current Jackpot 🪙${jackpot}` })

      await btn.editReply({
        embeds: [embed, ...extraEmbeds],
        components: gameState.running
          ? [row]
          : roll.type === 'game_over' || roll.type === 'pit-fiend'
          ? [gameOverRow]
          : [],
      })

      await handlePlayAgain(btn)
      return // exit playRound here
    }

    /* ─────────── normal (non-game-over) update ─────────── */
    // 5️⃣ Build Zalathor phrase
    const zalathorPhrases = [
      'Did you know I can grant wishes.',
      'The whispers say you’ll win… but I wouldn’t trust them.',
      'How pitiful. Spin again, maybe you’ll amuse me.',
      "Double down. I promise, it's safe...",
      'Somewhere, someone is winning BIG! But not you.',
      'Ah, the Gold Stage… so many possibilities... if you ever get there.',
      'I saw a player win the jackpot once. They disappeared right after.',
      'You should stop now!',
      "Gold, eggs, ichor… Does any of it matter? You'll suffer either way.",
      'There’s a hidden button in this game… but you’re not ready for it.',
      'Yawn.',
      'If you leave now, you might just escape my curse… maybe.',
      "TRA LA LA! …What? Can't a demon have fun?",
      'I heard you can win legendary cards here. Just keep playing...',
      'The more you play, the greater the jackpot.',
      'This game is fair. Trust me.',
      "My son won once, so I killed him. He's still around here... somewhere.",
      "You've come so far. Just a little more…",
      'Your odds are fantastic! Would I lie to you?',
      "You're so close to winning my card! Oh… never mind.",
      "Spin again! You're definitely hitting the jackpot this time.",
      'The Gold Stage? Ah, that’s just a myth. No one gets there.',
      'I bet you didn’t know that I devour the souls of quitters.',
      'Another round?',
    ]
    const shouldShowPhrase =
      Math.random() < 1 / (5 + Math.floor(Math.random() * 6))
    const randomPhrase = shouldShowPhrase
      ? zalathorPhrases[Math.floor(Math.random() * zalathorPhrases.length)]
      : null

    // 6️⃣ Build embed
    const footerText = `Current Jackpot 🪙${jackpot}`
    const embed = new EmbedBuilder()
      .setTitle(columnData[gameState.currentColumn].title)
      .setColor(columnData[gameState.currentColumn].color)
      .setDescription(randomPhrase ? `${msg}\n\n*${randomPhrase}*` : msg)
      .setThumbnail(thumbnailUrl)
      .setFooter({ text: footerText })

    if (!gameState.running) {
      // should be false only if you added more end states
      await btn.editReply({ embeds: [embed], components: [] })
      return
    }

    const row = createRow(gameState.totalGold, false)
    await btn.editReply({
      embeds: [embed, ...extraEmbeds],
      components: [row],
    })
  }

  // Helper function to create a new collector with anti-spam filtering and event handlers
  function createCollector() {
    const newCollector = interaction.channel.createMessageComponentCollector({
      filter: (b) => b.user.id === userId,
      time: 60_000,
    })

    collectors.set(userId, newCollector) // remember the active one

    newCollector.on('collect', async (b) => {
      if (gameState.running) return // ignore double-clicks
      gameState.running = true
      try {
        if (b.customId === `spin_again_${userId}`) {
          await playRound(b)
        } else if (b.customId === `stop_playing_${userId}`) {
          userData.gold += gameState.totalGold
          await userData.save()
          activePlayers.delete(userId)
          newCollector.stop()

          const end = new EmbedBuilder()
            .setTitle("Zalathor's Table Results 🎰")
            .setDescription(
              `Congrats! You walked away with **🪙${gameState.totalGold} gold**.`
            )
            .setColor('Green')
          try {
            if (!b.deferred && !b.replied) await b.deferUpdate()
          } catch {}
          await b.editReply({ embeds: [end], components: [] })
          gameState.running = false
          return
        }
      } catch (err) {
        console.error(err)
      } finally {
        gameState.running = false
      }
    })

    // restart collector if it times out while a game is still active
    newCollector.on('end', () => {
      if (gameState.running) {
        const c = createCollector() // recurse
        collectors.set(userId, c)
      } else {
        activePlayers.delete(userId)
      }
    })

    return newCollector
  }

  // Create the initial collector and set up the renewal interval
  if (collectors.has(userId)) {
    try {
      collectors.get(userId).stop()
    } catch {}
  }
  currentCollector = createCollector()
  collectors.set(userId, currentCollector)

  const collectorRenewInterval = setInterval(async () => {
    if (Date.now() - lastInteractionTime >= 30000 && gameState.running) {
      // console.log(
      //   `[Renew Slots] No interaction for 30 seconds for user: ${userId}. Renewing collector.`
      // )
      currentCollector.stop('timeout')
      lastInteractionTime = Date.now()
    }
  }, 1000)

  // Start the game by playing the first round
  gameState.running = true // ▶ tell playRound the game is active
  await playRound(interaction, true)
  gameState.running = false // ▶ allow next click
}

async function handlePlayAgain(interaction) {
  const userId = interaction.user.id

  const restartCollector = interaction.channel.createMessageComponentCollector({
    filter: (i) =>
      (i.customId === `play_again_${userId}` ||
        i.customId === `finish_${userId}`) &&
      i.user.id === userId,
    time: 30000,
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
        components: [],
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
