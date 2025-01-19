const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { Collection } = require('../../Models/model.js')

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
const { classifyMonsterType } = require('../Hunt/huntUtils/huntHelpers.js')
const { checkUserAccount } = require('../Account/checkAccount.js')
const { collectors, stopUserCollector } = require('../../utils/collectors')

// Cache tracking variable
let cachePopulated = false

// Pack costs
const PACK_COSTS = {
  starter: 0,
  common: 800,
  uncommon: 3500,
  rare: 10000,
  elemental: 5000,
  ichor: 650,
}

// Define tier options for each pack
const TIER_OPTIONS = {
  common: { name: 'Common' },
  uncommon: { name: 'Uncommon' },
  rare: { name: 'Rare' },
  elemental: {
    customTiers: [
      { name: 'Uncommon', chance: 0.98 },
      { name: 'Rare', chance: 0.02 },
    ],
  },
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Purchase a monster pack'),

  async execute(interaction) {
    const userId = interaction.user.id
    console.log(`[SHOP] Command executed by User: ${userId}`)

    await interaction.deferReply({ ephemeral: true })

    stopUserCollector(userId) // Stop any previous collectors
    console.log(`[SHOP] Stopped previous collector for User: ${userId}`)

    const user = await checkUserAccount(interaction)
    if (!user) return

    let userCollection
    try {
      userCollection = await Collection.findOne({ where: { userId: userId } })
    } catch (error) {
      console.error('[SHOP] Error querying Collection model:', error)
      return interaction.editReply({
        content: 'An error occurred while accessing the collection data.',
        ephemeral: true,
      })
    }

    const isStarterPackAvailable = !userCollection
    console.log(`[SHOP] Starter Pack Available: ${isStarterPackAvailable}`)

    if (!cachePopulated) {
      console.log('[SHOP] Cache not populated. Showing loading message...')
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffcc00)
            .setDescription('Loading shop data, please wait...'),
        ],
        components: [],
      })

      await cacheMonstersByTier()
      cachePopulated = true
      console.log('[SHOP] Cache populated successfully')
    }

    const gold = user.gold || 0
    const currency = user.currency || {}
    const energy = currency.energy || 0
    const tokens = currency.gems || 0
    const eggs = currency.eggs || 0
    const ichor = currency.ichor || 0

    const footerText = `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor}`

    const shopEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`-- Hunter Store --`)

      if (isStarterPackAvailable) {
        shopEmbed.setDescription(
         ` Here you can purchase packs containing monsters, tokens and other resources. Collecting monsters represent your hunter's growing prowess. The more you collect, the stronger you become.\n\nEach card falls under one of three fighting styles: **brute** / **spellsword** / **stealth** based on their monster type. You will need a solid collection of all types to make progress.\n\nHere's a complimentary starter pack to get you started!`
        )
      } else {
        shopEmbed.setDescription(
          `Purchase packs containing monsters or resources.  Use ` +
            '`' +
            `/help store` +
            '`' +
             `for a detailed description of each pack.` +
            `Use ` +
            '`' +
            `/account` +
            '`' +
            `at any time to see your style scores and collection.`
        )
      }

    const row = new ActionRowBuilder()

    if (isStarterPackAvailable) {
      shopEmbed.addFields({
        name: 'Starter Pack',
        value: `🆓 Free for new hunters!`,
        inline: true,
      })
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('purchase_starter_pack')
          .setLabel('Starter Pack')
          .setStyle(ButtonStyle.Secondary)
      )
    } else {
      shopEmbed
        .addFields(
          { name: 'Common Pack', value: `🪙${PACK_COSTS.common}`, inline: true },
          { name: 'Uncommon Pack', value: `🪙${PACK_COSTS.uncommon}`, inline: true },
          { name: 'Rare Pack', value: `🪙${PACK_COSTS.rare}`, inline: true },
          { name: 'Elemental Pack', value: `🪙${PACK_COSTS.elemental}`, inline: true },
          { name: '🧪Ichor Pack (12)', value: `🪙${PACK_COSTS.ichor}`, inline: true }
        )
        .setFooter({ text: footerText })

      row.addComponents(
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
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('purchase_ichor_pack')
          .setLabel('Ichor Pack')
          .setStyle(ButtonStyle.Success)
      )
    }

    await interaction.editReply({
      embeds: [shopEmbed],
      components: [row],
    })

    console.log(`[SHOP] Buttons sent. Setting up collector...`)

    const filter = (i) => i.user.id === userId
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000,
    })

    collectors.set(userId, collector)

    collector.on('collect', async (buttonInteraction) => {
      console.log(`[SHOP] Button clicked: ${buttonInteraction.customId} by User: ${userId}`)

      await buttonInteraction.deferUpdate()

      const packType = buttonInteraction.customId.split('_')[1]

      try {
        const monster = await pullValidMonster(TIER_OPTIONS[packType], packType)

        if (!monster) {
          console.error(`[SHOP] No valid monster found for ${packType}`)
          return interaction.followUp({
            content: `Could not retrieve a valid monster for the **${packType}** pack. Please try again later or contact support.`,
            ephemeral: true,
          })
        }
        
        const category = classifyMonsterType(monster.type)
        const stars = getStarsBasedOnColor(monster.color)
        const monsterEmbed = generateMonsterRewardEmbed(monster, category, stars)

        const result = await updateOrAddMonsterToCollection(userId, monster)

        if (result.isDuplicate) {
          await interaction.followUp({
            content: `You obtained another **${result.name}**. It increased from level **${result.previousLevel}** to **${result.newLevel}**!`,
            embeds: [monsterEmbed],
          })
        } else {
          await interaction.followUp({
            content: `You pulled a new **${result.name}** from the **${packType} pack!**`,
            embeds: [monsterEmbed],
          })
        }

        await updateTop5AndUserScore(userId)

        if (isStarterPackAvailable) {
          await interaction.followUp({
            content:
              `You have received your first monster and increased one of your fighting style scores! Keep in mind, only your top 3 cards of a style add to its score.\n\nWhen ready, use ` +
              '`' +
              `/account` +
              '`' +
              `to see your current collection or use`  +
              '`' +
              `/hunt` +
              '`' +
              `to begin your first hunt.`,
            embeds: [monsterEmbed],
          })
        } else {
        await interaction.followUp(
          `Could not retrieve a valid monster for the ${packType} pack. Please try again later or contact support.`
        )
      }
    

    collector.stop('completed')
      } catch (error) {
        console.error('[SHOP] Error handling button interaction:', error)
      }
    })

    collector.on('end', async () => {
      await interaction.editReply({ components: [] })
      console.log('[SHOP] Session expired.')
    })
  },
}