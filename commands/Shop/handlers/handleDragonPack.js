const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { checkUserAccount } = require('../../Account/checkAccount.js')

// Placeholder models for environments where Inventories and BaseItems are not available
const Inventories = {
  findAll: async () => [], // Returns an empty list to prevent crashes
  create: async () => {}, // Placeholder for item creation
}
const BaseItems = {}
const Arena = {}

const thumbnailUrl = `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/adult-red-dragon.jpg`

const DRAGON_PACK_COSTS = {
  dragon: 60,
  // scaled_grip: 10,
  // brimstone_vial: 20,
  // charred_fang_pendant: 30,
  // ravager: 40,
  // coalspine_blade: 50,
  // cinderplate: 50,
  // ember_maw: 15,
  // ashen_bastion: 25,
  // pyrewood_bow: 25,
  // healing_scepter: 45,
}

const DRAGON_PACK_DESCRIPTIONS = {
  dragon: 'Adult Red Dragon (CR 18)',
  // scaled_grip: 'Scaled Grip (+3% Brute)',
  // brimstone_vial: 'Brimstone Vial (+2% Stealth)',
  // charred_fang_pendant: 'Charred Fang Pendant (+1% Spellsword)',
  // ravager: 'Ravager (1% all scores)',
  // coalspine_blade: 'Coalspine Blade (4 🔥 damage / 4⚔️ damage)',
  // cinderplate: 'Cinderplate (4 ⚔️ defense / 4🔥defense)',
  // ember_maw: 'Ember Maw (2 🔥damage / 2 ☠️damage)',
  // ashen_bastion: 'Ashen Bastion (4 🔥defense)',
  // pyrewood_bow: 'Pyrewood Bow (4 🔥damage)',
  // healing_scepter: 'Healing Scepter (20 💖healing)',
}

async function handleDragonPack(interaction) {
  try {
    console.log(
      'Handling Dragon Pack interaction for user:',
      interaction.user.id
    )

    const userId = interaction.user.id
    const user = await checkUserAccount(interaction)
    if (!user) {
      console.log('User account not found')
      return
    }

    const gold = user.gold || 0
    const currency = user.currency || {}
    const energy = currency.energy || 0
    const tokens = currency.tokens || 0
    const eggs = currency.eggs || 0
    const ichor = currency.ichor || 0
    const gear = currency.gear || 0

    console.log(`User has ${eggs} eggs.`)

    // Placeholder logic: No inventory system in place, assume nothing is owned
    const purchasedItemNames = []

    const affordablePacks = Object.entries(DRAGON_PACK_COSTS)
      .filter(
        ([name, cost]) => eggs >= cost && !purchasedItemNames.includes(name)
      )
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

    const footerText = `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor} ⚙️${gear}`

    const dragonPackEmbed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('🔥 Dragon Shop 🔥')
      .setDescription(
        'Use your 🥚 eggs to purchase powerful Dragon equipment! Select an option below to see what you can afford.'
      )
      .addFields(
        {
          name: '**Hunt Equipment**',
          value:
            Object.entries(DRAGON_PACK_DESCRIPTIONS)
              .filter(([key]) =>
                [
                  'dragon',
                  'scaled_grip',
                  'brimstone_vial',
                  'charred_fang_pendant',
                  'ravager',
                ].includes(key)
              )
              .map(([_, desc]) => desc)
              .join('\n') || 'None',
          inline: true,
        },
        {
          name: '**Arena Equipment**',
          value:
            Object.entries(DRAGON_PACK_DESCRIPTIONS)
              .filter(
                ([key]) =>
                  ![
                    'dragon',
                    'scaled_grip',
                    'brimstone_vial',
                    'charred_fang_pendant',
                    'ravager',
                  ].includes(key)
              )
              .map(([_, desc]) => desc)
              .join('\n') || 'None',
          inline: true,
        }
      )
      .setThumbnail(thumbnailUrl)
      .setFooter({ text: footerText })

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_dragon_pack')
      .setPlaceholder('Choose a Dragon Pack')
      .addOptions(affordablePacks)

    const backButton = new ButtonBuilder()
      .setCustomId('back_to_shop')
      .setLabel('Back to Shop')
      .setStyle(ButtonStyle.Secondary)

    const row = new ActionRowBuilder().addComponents(selectMenu)
    const buttonRow = new ActionRowBuilder().addComponents(backButton)

    console.log('Sending response to user...')
    await interaction.reply({
      embeds: [dragonPackEmbed],
      components: [row, buttonRow],
      ephemeral: true,
    })
  } catch (error) {
    console.error('Error in handleDragonPack:', error)
  }
}

module.exports = { handleDragonPack, DRAGON_PACK_COSTS }
