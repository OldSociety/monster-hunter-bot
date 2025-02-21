//shop
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { Op } = require('sequelize')

const { Monster, Inventory, Collection } = require('../../Models/model.js')

const {
  populateMonsterCache,
  pullValidMonster,
} = require('../../handlers/cacheHandler')
const {
  updateOrAddMonsterToCollection,
  updateUserScores,
} = require('../../handlers/userMonsterHandler')
const { updateTop5AndUserScore } = require('../../handlers/topCardsManager')
const { calculateMScore } = require('../../handlers/userMonsterHandler.js')
const { pullSpecificMonster } = require('../../handlers/cacheHandler.js')
const {
  generateMonsterRewardEmbed,
} = require('../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../utils/starRating')
const { classifyMonsterType } = require('../Hunt/huntUtils/huntHelpers.js')
const { checkUserAccount } = require('../Account/checkAccount.js')
const { collectors, stopUserCollector } = require('../../utils/collectors')

const {
  handleDragonPack,
  DRAGON_PACK_COSTS,
} = require('./handlers/handleDragonPack.js')

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

const PROMOTION_COSTS = [
  { cr: 1, cost: 1200 },
  { cr: 2, cost: 2300 },
  { cr: 3, cost: 3400 },
  { cr: 4, cost: 4500 },
  { cr: 5, cost: 5300 },
  { cr: 6, cost: 6200 },
  { cr: 7, cost: 7100 },
  { cr: 8, cost: 8000 },
  { cr: 9, cost: 9000 },
  { cr: 10, cost: 9900 },
  { cr: 11, cost: 11200 },
  { cr: 12, cost: 12500 },
  { cr: 13, cost: 13800 },
  { cr: 14, cost: 15100 },
  { cr: 15, cost: 16400 },
  { cr: 16, cost: 18100 },
  { cr: 17, cost: 19800 },
  { cr: 18, cost: 21500 },
  { cr: 19, cost: 23200 },
  { cr: 20, cost: 25000 },
  { cr: 21, cost: 27200 },
  { cr: 22, cost: 29400 },
  { cr: 23, cost: 31600 },
  { cr: 24, cost: 34000 },
]

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

function getRarityByCR(cr) {
  if (cr >= 20) return 'Legendary'
  if (cr >= 16) return 'Very Rare'
  if (cr >= 11) return 'Rare'
  if (cr >= 5) return 'Uncommon'
  return 'Common'
}

function convertNameToIndex(name) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Purchase a monster pack'),

  async execute(interaction) {
    const userId = interaction.user.id

    try {
      await interaction.deferReply({ ephemeral: true })

      stopUserCollector(userId)

      const user = await checkUserAccount(interaction)
      if (!user) return

      let userCollection
      try {
        userCollection = await Collection.findOne({
          where: { userId: user.user_id },
        })
      } catch (error) {
        console.error('Error querying Collection model:', error)
        return interaction.editReply({
          content: 'An error occurred while accessing the collection data.',
          ephemeral: true,
        })
      }

      const isStarterPackAvailable = !userCollection

      if (!cachePopulated) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xffcc00)
              .setDescription('Loading shop data, please wait...'),
          ],
          components: [],
        })

        await populateMonsterCache()
        cachePopulated = true
      }

      const gold = user.gold || 0
      const currency = user.currency || {}
      const energy = currency.energy || 0
      const tokens = currency.tokens || 0
      const eggs = currency.eggs || 0
      const ichor = currency.ichor || 0

      const footerText = `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor}`

      const shopEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('-- Hunter Store --')
        .setDescription(
          isStarterPackAvailable
            ? "Here you can purchase packs containing monsters, tokens and other resources. Collecting monsters represent your hunter's growing prowess. The more you collect, the stronger you become.\n\nEach card falls under one of three fighting styles: **brute** / **spellsword** / **stealth** based on their monster type. You will need a solid collection of all types to make progress.\n\nHere's a complimentary starter pack to get you started!"
            : 'Purchase packs containing monsters or resources. Use `/help store`(NOT YET AVAILABLE) for a detailed description of each pack. Use `/account` at any time to see your style scores and collection.'
        )

      if (isStarterPackAvailable) {
        shopEmbed.addFields({
          name: 'Starter Pack',
          value: '🆓 Free for new hunters!',
          inline: true,
        })
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
            { name: 'Rare Pack', value: `🪙${PACK_COSTS.rare}`, inline: true },
            {
              name: 'Elemental Pack',
              value: `🪙${PACK_COSTS.elemental}`,
              inline: true,
            },
            {
              name: '🧪Ichor Pack (12)',
              value: `🪙${PACK_COSTS.ichor}`,
              inline: true,
            }
          )
          .setFooter({ text: footerText })
      }

      const PromotionAvailable = await Collection.findOne({
        where: { userId: user.user_id, copies: { [Op.gt]: 0 } },
      })

      const rows = [new ActionRowBuilder()]
      let currentRow = rows[0]

      function addButton(button) {
        if (currentRow.components.length >= 5) {
          currentRow = new ActionRowBuilder()
          rows.push(currentRow)
        }
        currentRow.addComponents(button)
      }

      if (isStarterPackAvailable) {
        addButton(
          new ButtonBuilder()
            .setCustomId('purchase_starter_pack')
            .setLabel('Starter Pack')
            .setStyle(ButtonStyle.Secondary)
        )
      } else {
        const packButtons = [
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
            .setStyle(ButtonStyle.Success),
        ]

        packButtons.forEach(addButton)
      }

      if (PromotionAvailable) {
        addButton(
          new ButtonBuilder()
            .setCustomId('promote_cards')
            .setLabel('Promote Cards')
            .setStyle(ButtonStyle.Secondary)
        )
      }
      if (eggs >= Math.min(...Object.values(DRAGON_PACK_COSTS))) {
        addButton(
          new ButtonBuilder()
            .setCustomId('open_dragon_pack')
            .setLabel('Dragon Pack')
            .setStyle(ButtonStyle.Danger)
        )
      }

      await interaction.editReply({
        embeds: [shopEmbed],
        components: rows.filter((row) => row.components.length > 0),
      })

      const filter = (i) => i.user.id === userId
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 60000,
      })

      collectors.set(userId, collector)

      collector.on('collect', async (interaction) => {
        try {
          if (interaction.customId === 'open_dragon_pack') {
            return await handleDragonPack(interaction)
          }

          if (interaction.customId === 'select_dragon_pack') {
            const selectedItem = interaction.values[0]

            await interaction.deferReply({ ephemeral: true })

            if (!DRAGON_PACK_COSTS[selectedItem]) {
              return interaction.editReply({
                content: `Invalid selection: ${selectedItem}. Please contact support.`,
                ephemeral: true,
              })
            }

            if (user.currency.eggs < DRAGON_PACK_COSTS[selectedItem]) {
              return interaction.editReply({
                content: `You don't have enough eggs to buy this. Required: 🥚${DRAGON_PACK_COSTS[selectedItem]}, Available: 🥚${user.currency.eggs}`,
                ephemeral: true,
              })
            }

            user.currency = {
              ...user.currency,
              eggs: user.currency.eggs - DRAGON_PACK_COSTS[selectedItem],
            }
            await user.setDataValue('currency', user.currency) // Force update
            console.log(
              `[DEBUG] Deducting 🥚${
                DRAGON_PACK_COSTS[selectedItem]
              } eggs. Remaining: ${
                user.currency.eggs - DRAGON_PACK_COSTS[selectedItem]
              }`
            )

            await user.save()

            if (selectedItem === 'dragon') {
              const monster = await pullSpecificMonster('adult-red-dragon')

              if (!monster) {
                return interaction.editReply({
                  content:
                    'Could not retrieve the Adult Red Dragon card. Please try again later or contact support.',
                  ephemeral: true,
                })
              }

              // Ensure necessary fields exist
              monster.rarity = 'Very Rare'
              monster.rank = 1

              const result = await updateOrAddMonsterToCollection(
                userId,
                monster
              )
              if (!result) {
                return interaction.editReply({
                  content: `An error occurred while adding **${monster.name}** to your collection. Please try again.`,
                  ephemeral: true,
                })
              }

              await updateTop5AndUserScore(userId)

              const category = classifyMonsterType(monster.type)
              const stars = getStarsBasedOnColor(monster.color || 0x000000) // Default color if missing
              const monsterEmbed = generateMonsterRewardEmbed(
                monster,
                category,
                stars
              )

              return interaction.editReply({
                content: `You have obtained the **${result.name}** from the Dragon Pack!`,
                embeds: [monsterEmbed],
              })
            } else {
              // Handle normal equipment purchase (adding to Inventories table)
              // await Inventory.create({ userId, itemName: selectedItem })
              console.log(
                selectedItem,
                ' purchased. Not added to Inventory. (TEST)'
              )
              return interaction.editReply({
                content: `You have successfully purchased **${selectedItem
                  .replace(/_/g, ' ')
                  .toUpperCase()}**!`,
                ephemeral: true,
              })
            }
          }

          if (interaction.customId.startsWith('purchase_')) {
            const packType = interaction.customId.split('_')[1]

            await interaction.deferReply({ ephemeral: true })

            const packCost = PACK_COSTS[packType]
            if (packCost === undefined) {
              return interaction.editReply({
                content: `Invalid pack type: ${packType}. Please contact support.`,
                ephemeral: true,
              })
            }

            if (user.gold < packCost) {
              return interaction.editReply({
                content: `You don't have enough gold to buy this pack. Required: 🪙${packCost}, Available: 🪙${user.gold}`,
                ephemeral: true,
              })
            }

            user.gold -= packCost

            await user.save()

            if (packType === 'ichor') {
              user.currency = {
                ...user.currency,
                ichor: user.currency.ichor + 10,
              }
              await user.save()

              const ichorEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('Ichor Pack Purchased')
                .setDescription(
                  `${interaction.user.username} has received 🧪10 ichor! You can spend ichor to increase your chances of winning by 20%.`
                )

              return interaction.editReply({
                content: `${interaction.user.username} purchased an Ichor Pack!`,
                embeds: [ichorEmbed],
              })
            }

            const monster = await pullValidMonster(
              TIER_OPTIONS[packType],
              packType,
              userId
            )
            if (!monster) {
              return interaction.editReply({
                content: `Could not retrieve a valid monster for the ${packType} pack. Please try again later or contact support.`,
                ephemeral: true,
              })
            }

            const category = classifyMonsterType(monster.type)
            const stars = getStarsBasedOnColor(monster.color)
            const monsterEmbed = generateMonsterRewardEmbed(
              monster,
              category,
              stars
            )

            const result = await updateOrAddMonsterToCollection(userId, monster)

            await interaction.editReply({
              content: result.isDuplicate
                ? `${interaction.user.username} obtained another ${result.name}. Come back to the /shop to promote your card and increase its score!`
                : `${interaction.user.username} pulled a new ${result.name} from the ${packType} pack!`,
              embeds: [monsterEmbed],
            })

            await updateTop5AndUserScore(userId)

            if (isStarterPackAvailable) {
              await interaction.followUp({
                content:
                  'You have received your first monster and increased one of your fighting style scores! Keep in mind, only your top 3 cards of a style add to its score.\n\nWhen ready, use `/account` to see your current collection or use `/hunt` to begin your first hunt.',
                embeds: [monsterEmbed],
              })
            }

            collector.stop('completed')
            return
          }

          if (interaction.customId === 'promote_cards') {
            const userMonsters = await Collection.findAll({
              where: { userId, copies: { [Op.gt]: 0 } },
            })

            if (userMonsters.length === 0) {
              return interaction.editReply({
                content: 'You have no cards available for promotion.',
                components: [],
              })
            }

            const monsterOptions = userMonsters.map((monster) => ({
              label: `${monster.name} (Lv. ${monster.rank})`,
              value: `promote_${monster.id}`,
              description: `Copies: ${monster.copies}`,
            }))

            const selectRow = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('select_promotion')
                .setPlaceholder('Select a card to promote')
                .addOptions(monsterOptions)
            )

            const promotionEmbed = new EmbedBuilder()
              .setTitle('🔼 Monster Promotion')
              .setDescription('Select a monster to promote.')
              .setColor('Gold')

            return interaction.update({
              embeds: [promotionEmbed],
              components: [selectRow],
            })
          }

          if (interaction.customId === 'select_promotion') {
            const selectedMonsterId = interaction.values[0].replace(
              'promote_',
              ''
            )
            const selectedMonster = await Collection.findOne({
              where: { id: selectedMonsterId, userId: user.user_id },
            })

            if (!selectedMonster) {
              return interaction.update({
                content: 'Error: Monster not found.',
                components: [],
              })
            }

            const promotionCostEntry = PROMOTION_COSTS.find(
              (entry) => entry.cr === selectedMonster.cr
            )
            const promotionCost = promotionCostEntry
              ? promotionCostEntry.cost
              : 1200
            const nextRank = selectedMonster.rank + 1

            let assignedRarity = getRarityByCR(selectedMonster.cr)

            const imageUrl = selectedMonster
              ? `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${convertNameToIndex(
                  selectedMonster.name
                )}.jpg`
              : 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/default.jpg'

            const newScore = calculateMScore(
              selectedMonster.cr,
              assignedRarity,
              nextRank
            )

            const promotionEmbed = new EmbedBuilder()
              .setTitle(`Promote: ${selectedMonster.name}`)
              .setDescription(
                `**Current Rank:** ${selectedMonster.rank}\n**Next Rank:** ${nextRank}\n**Current Score:** ${selectedMonster.m_score}\n**New Score:** ${newScore}\n\n**Cost:** 🪙${promotionCost}`
              )
              .setColor('Gold')
              .setFooter({
                text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor}`,
              })
              .setImage(imageUrl)
            // .setThumbnail(thumbnailUrl)

            const confirmRow = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`confirm_promotion_${selectedMonsterId}`)
                .setLabel('Promote')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('cancel_promotion')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
            )

            return interaction.update({
              embeds: [promotionEmbed],
              components: [confirmRow],
            })
          }

          if (interaction.customId.startsWith('confirm_promotion_')) {
            const monsterId = interaction.customId.replace(
              'confirm_promotion_',
              ''
            )
            const monster = await Collection.findOne({
              where: { id: monsterId, userId },
            })

            if (!monster) {
              return interaction.update({
                content: 'Error: Monster not found.',
                components: [],
              })
            }

            const promotionCostEntry = PROMOTION_COSTS.find(
              (entry) => entry.cr === monster.cr
            )
            const promotionCost = promotionCostEntry
              ? promotionCostEntry.cost
              : 1200

            if (user.gold < promotionCost) {
              return interaction.update({
                content: 'You do not have enough gold to promote this monster.',
                components: [],
              })
            }

            user.gold -= promotionCost
            monster.rank += 1

            let assignedRarity = getRarityByCR(monster.cr)

            const imageUrl = monster
              ? `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${convertNameToIndex(
                  monster.name
                )}.jpg`
              : 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/default.jpg'

            monster.m_score = calculateMScore(
              monster.cr,
              assignedRarity,
              monster.rank
            )

            monster.copies -= 1

            await user.save()
            await monster.save()

            await updateUserScores(
              user.user_id,
              classifyMonsterType(monster.type),
              monster
            )

            const successEmbed = new EmbedBuilder()
              .setTitle('✅ Promotion Successful!')
              .setDescription(
                `**${monster.name}** has reached level ${monster.rank}!`
              )
              .setColor('Green')
              .setFooter({
                text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor}`,
              })
              .setImage(imageUrl)

            return interaction.update({
              embeds: [successEmbed],
              components: [],
            })
          }

          if (interaction.customId === 'cancel_promotion') {
            return interaction.update({
              content: 'Promotion cancelled. Returning to shop...',
              components: [],
            })
          }
        } catch (error) {
          console.error('Error in shop interaction:', error)
          try {
            await interaction.reply({
              content: 'An unexpected error occurred. Please try again.',
              ephemeral: true,
            })
          } catch {
            await interaction.editReply({
              content: 'An unexpected error occurred. Please try again.',
              ephemeral: true,
            })
          }
        }
      })

      collector.on('end', async () => {
        try {
          await interaction.editReply({ components: [] })
        } catch (error) {
          console.error('Error ending shop collector:', error)
        }
      })
    } catch (error) {
      console.error('Fatal error in shop command:', error)
      try {
        await interaction.editReply({
          content: 'A critical error occurred. Please contact support.',
          ephemeral: true,
        })
      } catch {
        console.error('Could not send error reply')
      }
    }
  },
}
