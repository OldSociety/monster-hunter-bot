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
} = require('../../handlers/monsterHandler')
const { updateTop5AndUserScore } = require('../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../utils/starRating')
const { User } = require('../../Models/model')

// Excluded types for normal packs
const excludedTypes = new Set(['ooze', 'fiend', 'swarm of tiny beasts'])

// Cache tracking variable
let cachePopulated = false

// Pack costs
const PACK_COSTS = {
  common: 800, //800
  uncommon: 3500, //3500
  rare: 10000, //10000
  dragon: 15000, //15000
}

// Define tier options for each pack
const TIER_OPTIONS = {
  common: { name: 'Common' },
  uncommon: { name: 'Uncommon' },
  rare: { name: 'Rare' },
  dragon: { name: 'Rare', type: 'dragon' }, // Dragon Pack: limited to dragons up to Rare
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

    // Shop embed setup after cache is loaded
    const shopEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Monster Shop')
      .setDescription(
        'Welcome to the Monster Shop! Here you can purchase packs containing monsters of various tiers.'
      )
      .addFields(
        { name: 'Common Pack', value: `Cost: 🪙${PACK_COSTS.common}`, inline: true },
        { name: 'Uncommon Pack', value: `Cost: 🪙${PACK_COSTS.uncommon}`, inline: true },
        { name: 'Rare Pack', value: `Cost: 🪙${PACK_COSTS.rare}`, inline: true },
        { name: 'Dragon Pack', value: `Cost: 🪙${PACK_COSTS.dragon}`, inline: true }
      )
      .setFooter({ text: 'Select a pack to purchase.' })

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
        .setCustomId('purchase_dragon_pack')
        .setLabel('Dragon Pack')
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
            content: `You don't have enough gold to buy a ${packType} pack. It costs 🪙${packCost} gold.`,
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
    
        // Fetch monster, specifying Dragon pack if applicable
        const isDragonPack = packType === 'dragon'
        const monster = await pullValidMonster(tierOption, isDragonPack)
    
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
          await interaction.followUp('Could not retrieve a valid monster. Please try again later.')
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
