// shop.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')

const {
  cacheMonstersByTier,
  pullValidMonster,
} = require('../../handlers/pullHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../handlers/userMonsterHandler')
const { updateTop5AndUserScore } = require('../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../utils/starRating')
const { User } = require('../../Models/model')

// Cache tracking variable
let cachePopulated = false

// Pack costs
const PACK_COSTS = {
  common: 0, //800
  uncommon: 0, //3500
  rare: 0, //10000
  elemental: 0, //15000
}

// Define tier options for each pack
const TIER_OPTIONS = {
  common: { name: 'Common' },
  uncommon: { name: 'Uncommon' },
  rare: { name: 'Rare' },
  elemental: {
    customTiers: [
      { name: 'Common', chance: 0.55 },
      { name: 'Uncommon', chance: 0.37 },
      { name: 'Rare', chance: 0.08 },
    ],
  },
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Purchase a monster pack'),

  async execute(interaction) {
    await interaction.deferReply()
    console.log('Shop command started.')

    const userId = interaction.user.id

    // Ensure the user exists in the database
    let user = await User.findOne({ where: { user_id: userId } })
    if (!user) {
      user = await User.create({
        user_id: userId,
        user_name: interaction.user.username,
        gold: 1000,
      })
    }

    // Show loading embed if cache is not populated
    if (!cachePopulated) {
      console.log('Cache not populated. Showing loading embed.')
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffcc00)
            .setDescription('Loading shop data, please wait...'),
        ],
        components: [],
      })

      // Populate cache and set flag
      await cacheMonstersByTier()
      cachePopulated = true
      console.log('Cache populated successfully.')
    }

    const gold = user.gold || 0
    const currency = user.currency || {}
    const gems = currency.gems || 0
    const eggs = currency.eggs || 0
    const ichor = currency.ichor || 0

    const footerText = `Available: 🪙${gold} 💎${gems} 🥚${eggs} 🧪${ichor}`

    // Shop embed setup after cache is loaded
    const shopEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`Store`)
      .setDescription(
        `Welcome to the Monster Shop! Here you can purchase packs containing monsters of various tiers.`
      )
      .addFields(
        {
          name: 'Common Pack',
          value: `🪙${PACK_COSTS.common}`,
          inline: true,
        },
        {
          name: 'Uncommon Pack',
          value: `🪙${PACK_COSTS.uncommon}`,
          inline: true,
        },
        {
          name: 'Rare Pack',
          value: `🪙${PACK_COSTS.rare}`,
          inline: true,
        },
        {
          name: 'Elemental Pack',
          value: `🪙${PACK_COSTS.elemental}`,
          inline: true,
        }
      )
      .setFooter({ text: `${footerText}` })

    // Add buttons for each pack
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('purchase_common_pack')
        .setLabel('Common Pack')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('purchase_uncommon_pack')
        .setLabel('Uncommon Pack')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('purchase_rare_pack')
        .setLabel('Rare Pack')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('purchase_elemental_pack')
        .setLabel('Elemental Pack')
        .setStyle(ButtonStyle.Primary)
    )

    // Update embed with shop options
    await interaction.editReply({ embeds: [shopEmbed], components: [row] })

    // Set up button interaction collector
    const filter = (i) => i.user.id === userId
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    })

    collector.on('collect', async (buttonInteraction) => {
      const packType = buttonInteraction.customId.split('_')[1]
      const packCost = PACK_COSTS[packType]
      const tierOption = TIER_OPTIONS[packType]

      try {
        await buttonInteraction.deferUpdate()

        // Check if user has enough gold
        if (user.gold < packCost) {
          return buttonInteraction.followUp({
            content: `You don't have enough gold to buy a ${packType} pack. Available: 🪙${user.gold} gold`,
            ephemeral: true,
          })
        }

        // Deduct gold
        await user.decrement('gold', { by: packCost })

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription('Processing your purchase... Please wait.')
              .setColor(0xffcc00),
          ],
          components: [],
        })

        // Fetch monster, passing packType to pullValidMonster
        const monster = await pullValidMonster(tierOption, packType)

        if (monster) {
          await updateOrAddMonsterToCollection(userId, monster)
          await updateTop5AndUserScore(userId)

          const stars = getStarsBasedOnColor(monster.color)
          const monsterEmbed = generateMonsterRewardEmbed(monster, stars)

          await interaction.followUp({
            content: `You pulled a monster from the **${packType} pack!**`,
            embeds: [monsterEmbed],
          })
        } else {
          await interaction.followUp(
            `Could not retrieve a valid monster for the ${packType} pack. Please try again later or contact support.`
          )
        }

        collector.stop('completed')
      } catch (error) {
        console.error('Error handling the button interaction:', error)
        await interaction.followUp('An error occurred. Please try again later.')
      }
    })

    collector.on('end', async (collected, reason) => {
      if (reason === 'time' && cachePopulated) {
        const expiredEmbed = EmbedBuilder.from(shopEmbed).setFooter({
          text: 'Session expired. Please use /shop to try again.',
        })
        await interaction.editReply({ embeds: [expiredEmbed], components: [] })
        console.log('Session expired due to inactivity.')
      }
    })
  },
}
