// shop.js
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
const {classifyMonsterType} = require('../../utils/huntUtility/huntUtils')
const { checkUserAccount } = require('../Account/checkAccount.js')

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
    // const allowedChannels = [
    //   process.env.WINTERCHANNELID,
    //   process.env.BOTTESTCHANNELID,
    //   process.env.DEVBOTTESTCHANNELID,
    // ]

    // if (!allowedChannels.includes(interaction.channel.id)) {
    //   await interaction.reply({
    //     content: `🎰 This game can only be played in designated Blood Hunters channels.`,
    //     ephemeral: true,
    //   })
    //   return
    // }
    await interaction.deferReply({ ephemeral: true })
    const userId = interaction.user.id
    console.log('Shop command started.')

    const user = await checkUserAccount(interaction)
    if (!user) return

    // Check if the user has an empty collection
    let userCollection
    try {
      userCollection = await Collection.findOne({ where: { userId: userId } })
    } catch (error) {
      console.error('Error querying Collection model:', error)
      return interaction.reply({
        content: 'An error occurred while accessing the collection data.',
        ephemeral: true,
      })
    }
    const isStarterPackAvailable = !userCollection
    console.log('Starter:', isStarterPackAvailable)

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
        ephemeral: true,
      })

      // Populate cache and set flag
      await cacheMonstersByTier()
      cachePopulated = true
      console.log('Cache populated successfully.')
    }

    const gold = user.gold || 0
    const currency = user.currency || {}
    const energy = currency.energy || 0
    const gems = currency.gems || 0
    const eggs = currency.eggs || 0
    const ichor = currency.ichor || 0

    // const footerText = `Available: 🪙${gold} ⚡${energy} 💎${gems} 🥚${eggs} 🧪${ichor}`
    const footerText = `Available: 🪙${gold} ⚡${energy} 🧿${gems} 🧪${ichor}`

    // Shop embed setup after cache is loaded
    const shopEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(`-- Hunter Store --`)

    if (isStarterPackAvailable) {
      shopEmbed.setDescription(
        `Here you can purchase packs containing monsters, tokens and other resources. Collecting monsters represent your hunter's growing prowess. The more you collect, the stronger you become.\n\nEach card falls under one of three fighting styles: **brute** / **spellsword** / **stealth** based on their monster type. You will need a solid collection of all types to make progress.\n\nHere's a complimentary starter pack to get you started!`
      )
    } else {
      shopEmbed.setDescription(
        `Purchase packs containing monsters or resources.  Use ` +
          '``' +
          `/help store` +
          '``' +
          ` for a detailed description of each pack.` +
          `Use ` +
          '``' +
          `/account` +
          '``' +
          `at any time to see your style scores and collection.`
      )
    }

    const row = new ActionRowBuilder()

    if (isStarterPackAvailable) {
      // Only show Starter Pack
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
          },
          {
            name: '🧪Ichor Pack (12)',
            value: `🪙${PACK_COSTS.ichor}\n`,
            inline: true,
          }
        )
        .setFooter({ text: `${footerText}` })

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
    const components = row.components.length > 0 ? [row] : []
    await interaction.editReply({
      embeds: [shopEmbed],
      components,
      ephemeral: true,
    })

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

        if (user.gold < packCost) {
          return buttonInteraction.followUp({
            content: `You don't have enough gold to buy a ${packType} pack. Available: 🪙${user.gold} gold`,
            ephemeral: true,
          })
        }

        await user.decrement('gold', { by: packCost })

        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription('Processing your purchase... Please wait.')
              .setColor(0xffcc00),
          ],
          components: [],
        })

        if (packType === 'ichor') {
          user.currency = {
            ...user.currency,
            ichor: user.currency.ichor + 12,
          }

          await user.save()

          const ichorEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('Ichor Pack Purchased')
            .setDescription(
              `You have received 🧪12 ichor! You can spend ichor to increase your chances of winning by 20%.`
            )

          await interaction.followUp({
            content: `You purchased an **Ichor Pack**!`,
            embeds: [ichorEmbed],
          })
        } else {
          const monster = await pullValidMonster(tierOption, packType)
          const stars = getStarsBasedOnColor(monster.color)
          const category = classifyMonsterType(monster.type)
          console.log(category)
          const monsterEmbed = generateMonsterRewardEmbed(
            monster,
            category,
            stars
          )

          if (monster) {
            const result = await updateOrAddMonsterToCollection(userId, monster)

            if (result.isDuplicate) {
              const duplicateMessage = `You obtained another copy of **${result.name}**. It has increased from level **${result.previousLevel}** to level **${result.newLevel}**!`

              await interaction.followUp({
                content: duplicateMessage,
                embeds: [monsterEmbed], // You can include the updated monster embed here if needed
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
                  '``' +
                  `/account` +
                  '``' +
                  `to see your current collection or use ` +
                  '``' +
                  `/hunt` +
                  '``' +
                  `to begin your first hunt.`,
                embeds: [monsterEmbed],
              })
            }
          } else {
            await interaction.followUp(
              `Could not retrieve a valid monster for the ${packType} pack. Please try again later or contact support.`
            )
          }
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
