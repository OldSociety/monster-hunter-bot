const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js')
const { checkUserAccount } = require('../../Account/helpers/checkAccount.js')

const thumbnailUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/adult-red-dragon.jpg`

const DRAGON_PACK_COSTS = {
  blue_dragon_wyrmling: 10, // CR 3
  young_blue_dragon: 20, // CR 9
  adult_blue_dragon: 45, // CR 16
  green_dragon_wyrmling: 10, // CR 2
  young_green_dragon: 25, // CR 8
  adult_green_dragon: 50, // CR 15
  red_dragon_wyrmling: 15, // CR 4
  young_red_dragon: 30, // CR 10
  adult_red_dragon: 60, // CR 18
}

const DRAGON_PACK_DESCRIPTIONS = {
  blue_dragon_wyrmling: 'Blue Dragon Wyrmling (CR 3)',
  young_blue_dragon: 'Young Blue Dragon (CR 9)',
  adult_blue_dragon: 'Adult Blue Dragon (CR 16)',
  green_dragon_wyrmling: 'Green Dragon Wyrmling (CR 2)',
  young_green_dragon: 'Young Green Dragon (CR 8)',
  adult_green_dragon: 'Adult Green Dragon (CR 15)',
  red_dragon_wyrmling: 'Red Dragon Wyrmling (CR 4)',
  young_red_dragon: 'Young Red Dragon (CR 10)',
  adult_red_dragon: 'Adult Red Dragon (CR 18)',
}

async function handleDragonPack(interaction) {
  try {
    console.log(
      'Handling Dragon Pack interaction for user:',
      interaction.user.id
    )

    const user = await checkUserAccount(interaction)
    if (!user) {
      console.log('User account not found')
      return
    }

    const eggs = user.currency.eggs || 0

    console.log(`User has ${eggs} eggs.`)

    const affordablePacks = Object.entries(DRAGON_PACK_COSTS)
      .filter(([name, cost]) => eggs >= cost)
      .map(([name, cost]) => ({
        label: `${name
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())} - 🥚${cost}`,
        value: name,
        description: DRAGON_PACK_DESCRIPTIONS[name],
      }))

    if (affordablePacks.length === 0) {
      console.log('User cannot afford any Dragon Pack items.')
      return interaction.reply({
        content:
          'You do not have enough eggs to purchase any Dragon Pack items.',
        ephemeral: true,
      })
    }

    const footerText = `Available: 🥚${eggs}`

    const dragonPackEmbed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('🔥 Dragon Shop 🔥')
      .setDescription('Use your 🥚 eggs to purchase powerful Dragon Cards!')
      .setThumbnail(thumbnailUrl)
      .setFooter({ text: footerText })

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_dragon_pack')
      .setPlaceholder('Choose a Dragon')
      .addOptions(affordablePacks)

    const row = new ActionRowBuilder().addComponents(selectMenu)

    console.log('Sending response to user...')
    await interaction.reply({
      embeds: [dragonPackEmbed],
      components: [row],
      ephemeral: true,
    })
  } catch (error) {
    console.error('Error in handleDragonPack:', error)
  }
}

module.exports = { handleDragonPack, DRAGON_PACK_COSTS }
