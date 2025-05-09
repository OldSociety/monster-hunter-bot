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

const { User, Monster, Collection } = require('../../Models/model.js')

const {
  populateMonsterCache,
  pullValidMonster,
} = require('../../handlers/cacheHandler')
const {
  updateOrAddMonsterToCollection,
  updateUserScores,
} = require('../../handlers/userMonsterHandler')
const { updateTop3AndUserScore } = require('../../handlers/topCardsManager')
const { calculateMScore } = require('../../handlers/userMonsterHandler.js')
const { pullSpecificMonster } = require('../../handlers/cacheHandler.js')
const {
  generateMonsterRewardEmbed,
} = require('../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../utils/starRating')
const { classifyMonsterType } = require('../Hunt/huntUtils/huntHelpers.js')
const { checkUserAccount } = require('../Account/helpers/checkAccount.js')
const { handleRotatingPack } = require('./handlers/handleRotatingPack.js')
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
  elemental: 7000,
  werefolk: 8000,
  monstrosity: 6000,
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
  werefolk: {
    customTiers: [
      { name: 'Common', chance: 0.38 },
      { name: 'Uncommon', chance: 0.68 },
      { name: 'Rare', chance: 0.02 },
    ],
  },
  monstrosity: {
    customTiers: [
      { name: 'Uncommon', chance: 0.98 }, // example values
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

const GEAR_COST_BY_RARITY = {
  Common: 10,
  Uncommon: 20,
  Rare: 30,
  'Very Rare': 40,
  Legendary: 50,
}
function getGearCost(rarity) {
  return GEAR_COST_BY_RARITY[rarity] ?? 50
}

function convertNameToIndex(name) {
  return name.toLowerCase().replace(/\s+/g, '-')
}

function getCurrentRotatingPack() {
  const now = new Date()
  const day = now.getDay() // 0 (Sun) to 6 (Sat)
  const hour = now.getHours()

  // Packs switch at 6 AM
  if ((day === 4 && hour >= 6) || day === 5 || (day === 6 && hour < 6)) {
    return { type: 'Elemental', cost: PACK_COSTS.elemental }
  } else if ((day === 6 && hour >= 6) || day === 0 || (day === 1 && hour < 6)) {
    return { type: 'Werefolk', cost: PACK_COSTS.werefolk }
  } else {
    return { type: 'Monstrosity', cost: PACK_COSTS.monstrosity }
  }
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
      const gear = currency.gear || 0

      const footerText = `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor} ⚙️${gear}`

      // ── cards that could ever be upgraded ─────────────
      const allUpgradeable = await Collection.findAll({
        where: { userId: user.user_id, rank: { [Op.lt]: 7 } },
      })

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
        const rotatingPack = getCurrentRotatingPack()

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
              name: `${rotatingPack.type} Pack`,
              value: `🪙${rotatingPack.cost}`,
              inline: true,
            },
            {
              name: '🧪Ichor Pack (10)',
              value: `🪙${PACK_COSTS.ichor}`,
              inline: true,
            }
          )
          .setFooter({ text: footerText })
      }

      const gearOnHand = gear
      const hasPromotion = allUpgradeable.some((c) => {
        const rarity = getRarityByCR(c.cr)
        const gearCost = getGearCost(rarity)
        return c.copies > 0 || gearOnHand >= gearCost
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
        const rotatingPack = getCurrentRotatingPack() // Keep as is from your previous logic

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
            .setCustomId('purchase_rotating_pack')
            .setLabel(`${rotatingPack.type} Pack`)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('purchase_ichor_pack')
            .setLabel('Ichor Pack')
            .setStyle(ButtonStyle.Success),
        ]

        packButtons.forEach(addButton)
      }

      if (hasPromotion) {
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

            if (selectedItem) {
              const monster = await pullSpecificMonster(
                selectedItem.replace(/_/g, '-')
              )

              if (!monster) {
                return interaction.editReply({
                  content: `Could not retrieve the **${DRAGON_PACK_DESCRIPTIONS[selectedItem]}** card. Please try again later or contact support.`,
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

              await updateTop3AndUserScore(userId)

              const category = classifyMonsterType(monster.type)
              console.log(category)
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

          if (interaction.customId === 'purchase_rotating_pack') {
            return await handleRotatingPack(interaction, user)
          } else if (interaction.customId.startsWith('purchase_')) {
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

            if (packType === 'rotating') {
              // This prevents calling this handler incorrectly
              return interaction.editReply({
                content: 'Invalid pack selection. Please try again.',
                ephemeral: true,
              })
            }

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

            if (packType === 'starter') {
              const {
                allowedMonstersByPack,
              } = require('../../utils/shopMonsters.js')
              const starters = Array.from(allowedMonstersByPack.starter)
              const randomIndex = Math.floor(Math.random() * starters.length)
              const selectedKey = starters[randomIndex]

              const monster = await pullSpecificMonster(selectedKey)
              if (!monster) {
                return interaction.editReply({
                  content:
                    'Could not retrieve the starter pack monster. Please try again later or contact support.',
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

              const result = await updateOrAddMonsterToCollection(
                userId,
                monster
              )
              await updateTop3AndUserScore(userId)

              await interaction.editReply({
                content: 'Starter pack purchased!',
                embeds: [],
              })
              await interaction.followUp({
                content: `${interaction.user.username} obtained a new ${result.name} from the Starter Pack!`,
                embeds: [monsterEmbed],
                ephemeral: false,
              })

              collector.stop('completed')
              return
            }

            const monster = await pullValidMonster(
              TIER_OPTIONS[packType],
              packType,
              user.user_id
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
              content: 'Pack purchased!',
              embeds: [],
            })

            // Now send the card reward publicly:
            await interaction.followUp({
              content: result.isDuplicate
                ? `${interaction.user.username} obtained another ${result.name}.`
                : `${interaction.user.username} pulled a new ${result.name} from the ${packType} pack!`,
              embeds: [monsterEmbed],
              ephemeral: false,
            })

            await updateTop3AndUserScore(userId)

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

          // ----- Promotion Initial Selection (when user clicks "promote_cards") -----
          if (interaction.customId === 'promote_cards') {
            const promotableMonsters = allUpgradeable.filter((m) => {
              const rarity = getRarityByCR(m.cr)
              const gearCost = getGearCost(rarity)
              return m.copies > 0 || gearOnHand >= gearCost
            })
            if (promotableMonsters.length === 0) {
              return interaction.editReply({
                content: 'You have no cards available for promotion.',
                components: [],
              })
            }

            // Sort monsters by m_score descending
            const sortedPromotable = promotableMonsters.sort(
              (a, b) => b.m_score - a.m_score
            )

            // Map to options for select menu
            const monsterOptions = sortedPromotable.map((monster) => {
              const style = classifyMonsterType(monster.type)
              let emoji = ''
              if (style === 'brute' && user.top_brutes.includes(monster.id)) {
                emoji = ' ⚔️'
              } else if (
                style === 'spellsword' &&
                user.top_spellswords.includes(monster.id)
              ) {
                emoji = ' 🪄'
              } else if (
                style === 'stealth' &&
                user.top_stealths.includes(monster.id)
              ) {
                emoji = ' 🎭'
              }

              const rarity = getRarityByCR(monster.cr)
              const gearCost = getGearCost(rarity)

              return {
                label: `${monster.name} (Lv. ${monster.rank})${emoji}`,
                value: `promote_${monster.id}`,
                description:
                  monster.copies > 0
                    ? `Copies: ${monster.copies}`
                    : `Cost: ⚙️${gearCost}`,
              }
            })

            const itemsPerPage = 25
            const totalPages = Math.ceil(monsterOptions.length / itemsPerPage)
            let currentPage = 0
            const getPageOptions = (page) =>
              monsterOptions.slice(
                page * itemsPerPage,
                (page + 1) * itemsPerPage
              )

            // Build select menu with the options for the current page
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId(`select_promotion_page_${currentPage}`)
              .setPlaceholder(
                `Select a card to promote (Page ${
                  currentPage + 1
                } of ${totalPages})`
              )
              .addOptions(getPageOptions(currentPage))

            // Build action rows: one for the select menu, one for pagination buttons (if needed)
            const actionRows = []
            actionRows.push(new ActionRowBuilder().addComponents(selectMenu))

            if (totalPages > 1) {
              const paginationRow = new ActionRowBuilder()
              if (currentPage > 0) {
                paginationRow.addComponents(
                  new ButtonBuilder()
                    .setCustomId(`promotion_prev_page_${currentPage}`)
                    .setLabel('Previous Page')
                    .setStyle(ButtonStyle.Secondary)
                )
              }
              if (currentPage < totalPages - 1) {
                paginationRow.addComponents(
                  new ButtonBuilder()
                    .setCustomId(`promotion_next_page_${currentPage}`)
                    .setLabel('Next Page')
                    .setStyle(ButtonStyle.Secondary)
                )
              }
              actionRows.push(paginationRow)
            }

            const promotionEmbed = new EmbedBuilder()
              .setTitle('🔼 Monster Promotion')
              .setDescription(
                'Increase the strength of your cards by fusing copies up to 6 times. Cards that directly affect your score are marked below.'
              )
              .setColor('Gold')
              .addFields({
                name: 'Legend',
                value: '⚔️: Brute | 🪄: Spellsword | 🎭: Stealth',
                inline: false,
              })

            return interaction.update({
              embeds: [promotionEmbed],
              components: actionRows,
            })
          }

          // ----- Pagination Button Handlers -----
          if (
            interaction.customId.startsWith('promotion_next_page_') ||
            interaction.customId.startsWith('promotion_prev_page_')
          ) {
            // Extract current page from customId
            const parts = interaction.customId.split('_')
            const currentPage = parseInt(parts.pop())
            let newPage = currentPage
            if (interaction.customId.startsWith('promotion_next_page_')) {
              newPage = currentPage + 1
            } else {
              newPage = currentPage - 1
            }

            // Rebuild the promotion options (repeat same query and mapping)
            const userMonsters = await Collection.findAll({
              where: { userId, copies: { [Op.gt]: 0 } },
            })
            const promotableMonsters = userMonsters.filter(
              (monster) => monster.rank < 7
            )
            const sortedPromotable = promotableMonsters.sort(
              (a, b) => b.m_score - a.m_score
            )
            const monsterOptions = sortedPromotable.map((monster) => {
              const style = classifyMonsterType(monster.type)
              let emoji = ''
              if (style === 'brute' && user.top_brutes.includes(monster.id)) {
                emoji = ' ⚔️'
              } else if (
                style === 'spellsword' &&
                user.top_spellswords.includes(monster.id)
              ) {
                emoji = ' 🪄'
              } else if (
                style === 'stealth' &&
                user.top_stealths.includes(monster.id)
              ) {
                emoji = ' 🎭'
              }
              return {
                label: `${monster.name} (Lv. ${monster.rank})${emoji}`,
                value: `promote_${monster.id}`,
                description: `Copies: ${monster.copies}`,
              }
            })
            const itemsPerPage = 25
            const totalPages = Math.ceil(monsterOptions.length / itemsPerPage)
            const getPageOptions = (page) =>
              monsterOptions.slice(
                page * itemsPerPage,
                (page + 1) * itemsPerPage
              )

            // Build updated select menu with newPage options
            const selectMenu = new StringSelectMenuBuilder()
              .setCustomId(`select_promotion_page_${newPage}`)
              .setPlaceholder(
                `Select a card to promote (Page ${
                  newPage + 1
                } of ${totalPages})`
              )
              .addOptions(getPageOptions(newPage))

            const actionRows = []
            actionRows.push(new ActionRowBuilder().addComponents(selectMenu))

            if (totalPages > 1) {
              const paginationRow = new ActionRowBuilder()
              if (newPage > 0) {
                paginationRow.addComponents(
                  new ButtonBuilder()
                    .setCustomId(`promotion_prev_page_${newPage}`)
                    .setLabel('Previous Page')
                    .setStyle(ButtonStyle.Secondary)
                )
              }
              if (newPage < totalPages - 1) {
                paginationRow.addComponents(
                  new ButtonBuilder()
                    .setCustomId(`promotion_next_page_${newPage}`)
                    .setLabel('Next Page')
                    .setStyle(ButtonStyle.Secondary)
                )
              }
              actionRows.push(paginationRow)
            }

            const promotionEmbed = new EmbedBuilder()
              .setTitle('🔼 Monster Promotion')
              .setDescription(
                'Increase the strength of your cards by fusing copies up to 6 times. Cards that directly affect your score are marked below.'
              )
              .setColor('Gold')
              .addFields({
                name: 'Legend',
                value: '⚔️: Brute | 🪄: Spellsword | 🎭: Stealth',
                inline: false,
              })

            return interaction.update({
              embeds: [promotionEmbed],
              components: actionRows,
            })
          }

          // ----- Handling Selection from the Paginated Menu -----

          if (interaction.customId.startsWith('select_promotion_page_')) {
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

            const rarity = getRarityByCR(selectedMonster.cr)
            const gearCost = getGearCost(rarity)
            const hasCopy = selectedMonster.copies > 0
            const costLine = hasCopy
              ? '**Cost:** 1 copy'
              : `**Cost:** ⚙️${gearCost}`

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

            // Retrieve the matching monster from the Monster model
            const monsterData = await Monster.findOne({
              where: { name: selectedMonster.name },
            })

            const thumbnailUrl =
              monsterData && monsterData.combatType
                ? `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monsterData.combatType}C.png`
                : 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/default.png'

            console.log(thumbnailUrl)
            const promotionEmbed = new EmbedBuilder()
              .setTitle(`Promote: ${selectedMonster.name}`)
              .setDescription(
                `**Current Rank:** ${selectedMonster.rank}\n` +
                  `**Next Rank:** ${nextRank}\n` +
                  `**Current Score:** ${selectedMonster.m_score}\n` +
                  `**New Score:** ${newScore}\n\n` +
                  costLine
              )
              .setColor('Gold')
              .setFooter({
                text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
              })
              .setImage(imageUrl)
              .setThumbnail(thumbnailUrl)

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

            const rarity = getRarityByCR(monster.cr)
            const gearCost = getGearCost(rarity)

            // choose payment method
            if (monster.copies > 0) {
              monster.copies -= 1 // free promotion with copy
            } else {
              if (user.currency.gear < gearCost) {
                return interaction.update({
                  content: 'Not enough ⚙️gear.',
                  components: [],
                })
              }
              user.currency.gear -= gearCost
              user.changed('currency', true)
              await user.save({ fields: ['currency'] })
            }
            monster.rank += 1

            if (!User) console.log('User model is undefined')

            try {
              const refreshed = await User.findByPk(user.user_id)
              console.log('After Refresh:', refreshed.currency.gear)
            } catch (e) {
              console.error('Could not refresh user from DB:', e)
            }

            let assignedRarity = getRarityByCR(monster.cr)

            // Retrieve the matching monster data to get its combatType.
            const monsterData = await Monster.findOne({
              where: { name: monster.name },
            })

            const thumbnailUrl =
              monsterData && monsterData.combatType
                ? `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monsterData.combatType}C.png`
                : 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/default.png'

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


            await monster.save()
            console.log(
              `After save: Monster ID=${monster.id}, m_score=${monster.m_score}`
            )
            console.log('stealth', user.stealth_score)

            await user.save()
            console.log(
              `User after promotion: user_id=${user.user_id}, gold=${user.gold}`
            )

            await updateUserScores(
              user.user_id,
              classifyMonsterType(monster.type),
              monster
            )

            const currentRank = monster.rank
            const previousRank = currentRank - 1

            const oldScore = calculateMScore(
              monster.cr,
              assignedRarity,
              previousRank
            )
            const newScore = calculateMScore(
              monster.cr,
              assignedRarity,
              currentRank
            )

            const successEmbed = new EmbedBuilder()
              .setTitle('✅ Promotion Successful!')
              .setDescription(
                `**${monster.name}** has reached level ${currentRank}!\n\n` +
                  `**Previous Score:** ${oldScore}\n` +
                  `**New Score:** ${newScore}`
              )
              .setColor('Green')
              .setFooter({
                text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
              })
              .setImage(imageUrl)
              .setThumbnail(thumbnailUrl)

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
