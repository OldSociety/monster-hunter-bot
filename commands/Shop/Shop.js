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
} = require('../../handlers/monsterHandler')
const { updateTop5AndUserScore } = require('../../handlers/topCardsManager')

const {
  generateMonsterRewardEmbed,
} = require('../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../utils/starRating')

const { User } = require('../../Models/model')

// EXCLUDED TYPES
const excludedTypes = new Set([
  'ooze',
  'dragon',
  'fiend',
  'swarm of tiny beasts',
])

// Cache tracking variable
let cachePopulated = false

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Purchase a monster pack'),

  async execute(interaction) {
    await interaction.deferReply()
    console.log('Shop command started.')

    const userId = interaction.user.id
    const PACK_COST = 0

    // Ensure the user exists in the database
    let user = await User.findOne({ where: { user_id: userId } })
    if (!user) {
      user = await User.create({
        user_id: userId,
        user_name: interaction.user.username,
        gold: 1000,
      })
    }

    // Check if user has enough gold
    if (user.gold < PACK_COST) {
      return interaction.editReply(
        "You don't have enough gold to buy a pack. Each pack costs 🪙800 gold."
      )
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
      .addFields({
        name: 'Common Pack',
        value: `Contains common monsters only\nCost: 🪙${PACK_COST} gold`,
        inline: true,
      })
      .setFooter({ text: 'Click the button below to purchase a Common Pack.' })

    // Add button to purchase pack
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('purchase_common_pack')
        .setLabel('Buy Common Pack')
        .setStyle(ButtonStyle.Primary)
    )

    // Update embed with shop options
    await interaction.editReply({ embeds: [shopEmbed], components: [row] })

    // Set up button interaction collector
    const filter = (i) =>
      i.customId === 'purchase_common_pack' && i.user.id === userId
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 15000,
    })

    collector.on('collect', async (buttonInteraction) => {
      try {
        console.log('Purchase button clicked.')
        await buttonInteraction.deferUpdate()

        // Deduct gold and show processing message
        await user.decrement('gold', { by: PACK_COST })
        console.log('Gold deducted.')

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription('Processing your purchase... Please wait.')
              .setColor(0xffcc00),
          ],
          components: [],
        })

        // Pull a common monster
        let monster
        let retries = 0
        const maxRetries = 5
        const selectedTier = { name: 'Common' }

        do {
          monster = await pullValidMonster(selectedTier)
          if (monster && excludedTypes.has(monster.type.toLowerCase())) {
            console.log(`Excluded monster type: ${monster.type}`)
            monster = null
          }
          retries++
        } while (!monster && retries < maxRetries)

        // Inside the collector logic in shop.js:
        if (monster) {
          await updateOrAddMonsterToCollection(userId, monster)
          await updateTop5AndUserScore(userId)

          const stars = getStarsBasedOnColor(monster.color)

          const monsterEmbed = generateMonsterRewardEmbed(monster, stars)

          await interaction.followUp({
            content: 'You pulled a monster from the pack!',
            embeds: [monsterEmbed],
          })
        } else {
          await interaction.followUp(
            'Could not retrieve a valid monster. Please try again later.'
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
