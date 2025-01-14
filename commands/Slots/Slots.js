const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
} = require('discord.js')
const { User } = require('../../Models/model.js')

let jackpot = 10000
const activePlayers = new Set() // Track active players to prevent multiple instances

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription(`Risk your soul at Zalathor's Table.`),
  async execute(interaction) {
    // const allowedChannels = [process.env.WINTERCHANNELID, process.env.BOTTESTCHANNELID, process.env.DEVBOTTESTCHANNELID]

    // if (!allowedChannels.includes(interaction.channel.id)) {
    //   await interaction.reply({
    //     content: `🎰 This game can only be played in designated Blood Hunters channels.`,
    //     ephemeral: true,
    //   })
    //   return
    // }

    const userId = interaction.user.id

    if (activePlayers.has(userId)) {
      await interaction.reply({
        content: `🎰 You already have a game in progress! Finish your current game first.`,
        ephemeral: true,
      })
      return
    }

    let userData = await User.findOne({ where: { user_id: userId } })
    if (!userData) {
      await interaction.reply({
        content: `🎰 You need to set up your account first. Use \`/account\` to get started!`,
        ephemeral: true,
      })
      return
    }

    if (userData.currency.gems < 1) {
      await interaction.reply({
        content: `🎰 You don't have enough 🧿tokens to play! It costs 1 token per game.`,
        ephemeral: true,
      })
      return
    }

    activePlayers.add(userId)

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start_game')
        .setLabel("Let's Play (🧿1 token)")
        .setStyle('Primary')
    )
    const gold = userData.gold || 0
    const currency = userData.currency || {}
    const energy = currency.energy || 0
    const tokens = currency.gems || 0
    const eggs = currency.eggs || 0
    const ichor = currency.ichor || 0
    const footerText = `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor}`
    const thumbnailUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/pit-fiend.jpg`

    const explanationEmbed = new EmbedBuilder()
      .setTitle(`Zalathor's Slots! 🎰`)
      .setDescription(
        `Welcome to my game of chance. Shit's not fair, but give it a spin anyway. Advance through five stages of Hell—**Red, Blue, Green, Gold, and Silver**. Each stage increases the stakes and potential rewards.\n\n` +
          `- **Risk/Reward:** Grow your pot of gold with each roll, but be careful every new roll risks losing it all. You can stop at any time to collect your winnings *(items won are never lost)*.\n` +
          `- **Jackpot:** Chance to win the 🪙grand prize on the Silver Stage! 🏆\n` +
          `- **Balor Card**: With a bit of bad luck, you might even earn me-the rarest card in Blood Hunter! *(Pit Fiend, CR: 20)*\n`
      )
      .setColor('Red')
      .setFooter({ text: `${footerText}` })
      .addFields({
        name: 'Current Jackpot',
        value: `🪙${jackpot} gold`,
        inline: true,
      })
      .setThumbnail(thumbnailUrl)

    await interaction.reply({
      embeds: [explanationEmbed],
      components: [row],
      ephemeral: true,
    })

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (btnInteraction) => btnInteraction.user.id === userId,
      time: 30000, // Timeout after 30 seconds
    })

    collector.on('collect', async (btnInteraction) => {
      try {
        if (btnInteraction.customId === 'start_game') {
          // Defer the interaction to prevent "Interaction Failed"
          await btnInteraction.deferUpdate()

          // Start the game
          collector.stop('game_started')
          await startGame(interaction, userData)
        }
      } catch (error) {
        console.error('Error during game start:', error)
        collector.stop('error')
      }
    })
  },
}

async function startGame(interaction, userData) {
  const userId = interaction.user.id

  // Deduct cost to play
  userData.currency = { ...userData.currency, gems: userData.currency.gems - 1 }
  await userData.save()
  jackpot += Math.floor(Math.random() * 6) + 5

  const columnData = [
    {
      title: 'Red Stage',
      color: 'Red',
      effects: [
        {
          emoji: '🎅',
          type: 'gain',
          chance: 50,
          range: [10, 30],
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
          range: [5, 15],
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
          range: [20, 80],
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
          range: [6, 66],
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
          range: [100, 130],
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
          range: [66, 66],
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
          message: '**🧪Ichor Found!**',
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
      title: 'Gold Stage',
      color: 'Gold',
      effects: [
        {
          emoji: '🎅',
          type: 'gain',
          chance: 35,
          range: [777],
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
          range: [666],
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
          message: '**🥚 Dragon Eggs! 🥚**',
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
      title: 'Silver Stage',
      color: 'Silver',
      effects: [
        {
          emoji: '🎅',
          type: 'gain',
          chance: 39,
          range: [777],
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
          range: [666],
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

  const gameState = {
    currentColumn: 0,
    totalGold: 0,
    running: true,
  }

  const createRow = (totalGold) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('spin_again')
        .setLabel('Spin Again')
        .setStyle('Primary'),
      new ButtonBuilder()
        .setCustomId('stop_playing')
        .setLabel(`Stop and collect 🪙${totalGold} gold`)
        .setStyle('Secondary')
    )

  const playRound = async (interactionObject, isInitial = false) => {
    let effects = columnData[gameState.currentColumn].effects

    // Initial roll excludes "advance" and "game_over"
    if (isInitial) {
      effects = effects.filter(
        (effect) => effect.type !== 'advance' && effect.type !== 'game_over'
      )
    }

    // Perform the weighted random selection
    const roll = weightedRandom(effects)
    let message = roll.message

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
        const deductedAmount = Math.min(amount, gameState.totalGold) // Ensure not more than totalGold is deducted
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
      //CODE ZALATHOR CARD REWARD
    } else if (roll.type === 'game_over') {
      jackpot += Math.max(Math.floor(gameState.totalGold / 2), 0)
      gameState.running = false
      activePlayers.delete(interactionObject.user.id)
      message += ` You lost your pot of 🪙**${gameState.totalGold} gold**.`
      gameState.totalGold = 0
    } else if (roll.type === 'energy') {
      userData.currency = {
        ...userData.currency,
        ichor: userData.currency.energy + 1,
      }
      await userData.save()

      message += ` You gained ⚡energy!`
    } else if (roll.type === 'eggs') {
      userData.currency = {
        ...userData.currency,
        eggs: userData.currency.eggs + 5,
      }
      await userData.save()

      message += ` You gained 🥚5 dragon eggs!`
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
      activePlayers.delete(interactionObject.user.id)
      message += ` You won the JACKPOT of 🪙${jackpot} gold!`
      jackpot = 1000 // Reset the jackpot
    }

    const gold = userData.gold || 0
    const currency = userData.currency || {}
    const energy = currency.energy || 0
    const tokens = currency.gems || 0
    const eggs = currency.eggs || 0
    const ichor = currency.ichor || 0
    const footerText = `Current Jackpot 🪙${jackpot}`

    const embed = new EmbedBuilder()
      .setTitle(columnData[gameState.currentColumn].title)
      .setColor(columnData[gameState.currentColumn].color)
      .setDescription(message)
      .addFields(
        {
          name: 'Current Pot',
          value: `🪙${gameState.totalGold}`,
          inline: true,
        }
        // { name: 'Jackpot', value: `🪙${jackpot}`, inline: true }
      )
      .setFooter({ text: `${footerText}` })

    // Check if game is over
    if (!gameState.running) {
      activePlayers.delete(interactionObject.user.id)
      await interactionObject[
        interactionObject.replied ? 'editReply' : 'update'
      ]({
        embeds: [embed],
        components: [],
      })
      return
    }

    // Update the interaction for ongoing games
    await interactionObject[isInitial ? 'editReply' : 'update']({
      embeds: [embed],
      components: [createRow(gameState.totalGold)],
    })
  }

  await playRound(interaction, true)

  const collector = interaction.channel.createMessageComponentCollector({
    filter: (btnInteraction) => btnInteraction.user.id === userId,
    time: 60000,
  })

  collector.on('collect', async (btnInteraction) => {
    try {
      if (btnInteraction.customId === 'spin_again') {
        await playRound(btnInteraction)
        if (!gameState.running) collector.stop('game_over')
      } else if (btnInteraction.customId === 'stop_playing') {
        userData.gold += gameState.totalGold
        await userData.save()
        gameState.running = false
        activePlayers.delete(userId)
        const gold = userData.gold || 0
        const currency = userData.currency || {}
        const energy = currency.energy || 0
        const tokens = currency.gems || 0
        const eggs = currency.eggs || 0
        const ichor = currency.ichor || 0
        const footerText = `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor}`

        const finalEmbed = new EmbedBuilder()
          .setTitle(`Zalathor's Table Results 🎰`)
          .setDescription(
            `Congrats! You walked away with **🪙${gameState.totalGold} gold**.`
          )
          .setFooter({ text: `${footerText}` })
          .setColor('Green')

        await btnInteraction.update({
          embeds: [finalEmbed],
          components: [],
        })

        collector.stop('user_stopped')
      }
    } catch (error) {
      console.error('Error during interaction collection:', error)
      collector.stop('error')
    }
  })

  collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      activePlayers.delete(userId)
      await interaction.editReply({
        content: `⏳ Time's up! Your game has ended.`,
        components: [],
      })
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
