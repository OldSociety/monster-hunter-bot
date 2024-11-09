const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { User, Collection } = require('../../Models/model.js')
const { Op } = require('sequelize')

// Copies needed for each level
const copiesNeededPerLevel = {
  1: 3,
  2: 4,
  3: 4,
  4: 5,
  5: 6,
  6: 6,
  7: 7,
  8: 7,
  9: 8,
}

function getRaritySymbol(cr) {
  if (cr >= 20) return '⭐⭐⭐⭐⭐' // Legendary
  if (cr >= 16) return '⭐⭐⭐⭐★' // Very Rare
  if (cr >= 11) return '⭐⭐⭐★★' // Rare
  if (cr >= 5) return '⭐⭐★★★' // Uncommon
  return '⭐★★★★' // Common
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription(
      'View your Blood Hunter game stats and collection progress'
    )
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription(
          'Specify which top cards to view (brute, caster, sneak, or all)'
        )
        .setRequired(false)
        .addChoices(
          { name: 'Brute', value: 'brute' },
          { name: 'Caster', value: 'caster' },
          { name: 'Sneak', value: 'sneak' },
          { name: 'All', value: 'monster' }
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id
    const category = interaction.options.getString('category') || 'overview'

    try {
      const user = await User.findOne({ where: { user_id: userId } })
      if (!user) {
        return interaction.reply({
          content:
            'You do not have any recorded stats yet. Start playing to track your progress!',
          ephemeral: true,
        })
      }

      // Set embed color based on category
      let embedColor
      switch (category) {
        case 'brute':
          embedColor = '#FF0000' // Red for Brutes
          break
        case 'caster':
          embedColor = '#0000FF' // Blue for Casters
          break
        case 'sneak':
          embedColor = '#800080' // Purple for Sneaks
          break
        default:
          embedColor = '#00FF00' // Green for Overview
      }

      if (category === 'overview') {
        const crCategories = {
          Common: [0, 4],
          Uncommon: [5, 10],
          Rare: [11, 15],
          'Very Rare': [16, 19],
          Legendary: [20, Infinity],
        }

        const totalMonsters = {
          Common: 154,
          Uncommon: 65,
          Rare: 24,
          'Very Rare': 10,
          Legendary: 15,
        }

        const rarityCounts = await Promise.all(
          Object.entries(crCategories).map(async ([rarity, crRange]) => {
            const condition =
              rarity === 'Legendary'
                ? { cr: { [Op.gte]: crRange[0] } }
                : { cr: { [Op.between]: crRange } }

            const count = await Collection.count({
              where: {
                userId: userId,
                ...condition,
              },
            })
            return { rarity, count }
          })
        )

        const gold = user.gold || 0
        const currency = user.currency || {}
        const energy = currency.energy || 0
        const gems = currency.gems || 0
        const eggs = currency.eggs || 0
        const ichor = currency.ichor || 0
    
        const footerText = `Available: 🪙${gold} ⚡${energy} 💎${gems} 🥚${eggs} 🧪${ichor}`

        const statsEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(`Blood Hunter Game Stats`)
          .addFields(
            {
              name: '**-- Category Scores --**',
              value: `**Overall**: ${user.score}\n**Brutes**: ${user.brute_score}\n**Casters**: ${user.caster_score}\n**Sneaks**: ${user.sneak_score}`,
              inline: true,
            },
            {
              name: '**-- Collection Stats by Rarity --**',
              value: 'Track your collection progress below:',
              inline: false,
            }
          )
          .setThumbnail(interaction.user.displayAvatarURL())
          .setFooter({ text: footerText })

        rarityCounts.forEach(({ rarity, count }) => {
          const total = totalMonsters[rarity]
          const percentage = ((count / total) * 100).toFixed(1)
          statsEmbed.addFields({
            name: `${rarity}`,
            value: '`' + `${count} / ${total} ➜ (${percentage}%)` + '`',
            inline: false,
          })
        })

        await interaction.reply({ embeds: [statsEmbed] })
      } else {
        // Determine whether to fetch top cards from a specific category or overall
        const categoryField =
          category === 'all' ? 'top_monsters' : `top_${category}s`
        const topCardsIds = user[categoryField] || []

        // Fetch top cards based on the category or overall selection
        const topCards = await Collection.findAll({
          where: { id: topCardsIds },
          attributes: ['name', 'm_score', 'level', 'copies', 'cr'],
          order: [['m_score', 'DESC']],
          limit: 3, // Limit to top 3 for the "all" category
        })

        const statsEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(
            `Top ${
              category === 'all'
                ? 'Overall'
                : category.charAt(0).toUpperCase() + category.slice(1)
            } Cards`
          )
          .setThumbnail(interaction.user.displayAvatarURL())

        if (topCards.length > 0) {
          topCards.forEach((card) => {
            const copiesNeeded = copiesNeededPerLevel[card.level] || 'Max'
            const raritySymbol = getRaritySymbol(card.cr)

            statsEmbed.addFields(
              {
                name: `${card.name}`,
                value: `${raritySymbol}`,
                inline: false,
              },
              {
                name: 'Score',
                value: '`' + `${card.m_score}` + '`',
                inline: true,
              },
              {
                name: 'Level',
                value: '`' + `${card.level}` + '`',
                inline: true,
              },
              {
                name: 'Copies',
                value: '`' + `${card.copies} / ${copiesNeeded}` + '`',
                inline: true,
              }
            )
          })
        } else {
          statsEmbed.addFields({
            name: 'No Cards Available',
            value: `You currently have no cards in the ${category} category.`,
            inline: false,
          })
        }

        await interaction.reply({ embeds: [statsEmbed] })
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      await interaction.reply({
        content:
          'An error occurred while fetching your stats. Please try again later.',
        ephemeral: true,
      })
    }
  },
}
