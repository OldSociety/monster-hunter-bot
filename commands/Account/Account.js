const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { User, Collection } = require('../../Models/model.js')
const { Op } = require('sequelize')

function getRaritySymbol(cr) {
  if (cr >= 20) return '⭐⭐⭐⭐⭐' // Legendary
  if (cr >= 16) return '⭐⭐⭐⭐★' // Very Rare
  if (cr >= 11) return '⭐⭐⭐★★' // Rare
  if (cr >= 5) return '⭐⭐★★★' // Uncommon
  return '⭐★★★★' // Common
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('account')
    .setDescription('View your Blood Hunter game stats and collection progress')
    .addStringOption((option) =>
      option
        .setName('style')
        .setDescription(
          'Specify which top cards to view (brute, spellsword, stealth, or all)'
        )
        .setRequired(false)
        .addChoices(
          { name: 'Brute', value: 'brute' },
          { name: 'Spellsword', value: 'spellsword' },
          { name: 'Stealth', value: 'stealth' },
          { name: 'All', value: 'monster' }
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id
    const category = interaction.options.getString('style') || 'overview'

    try {
      let user = await User.findOne({ where: { user_id: userId } })
      if (!user) {
        // Create a new user account
        user = await User.create({
          user_id: userId,
          user_name: interaction.user.username,
          gold: 500,
          currency: {
            energy: 15,
            gems: 0,
            eggs: 0,
            ichor: 3,
            dice: 0,
          },
          score: 0,
          brute_score: 0,
          spellsword_score: 0,
          stealth_score: 0,
          top_monsters: [],
          top_brutes: [],
          top_spellswords: [],
          top_stealths: [],
          completedLevels: 0,
        })

        // Send a welcome message
        const welcomeEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Welcome to Blood Hunter!')
          .setDescription(
            `You have joined the hunt!\n Use ` +
              '``' +
              `/shop` +
              '``' +
              `to get your first card.`
          )
          .setFooter({
            text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.gems} 🧪${user.currency.ichor}`,
          })
          .setThumbnail(interaction.user.displayAvatarURL())

        return interaction.reply({ embeds: [welcomeEmbed], ephemeral: true })
      }

      // User exists, display their stats
      let embedColor
      switch (category) {
        case 'brute':
          embedColor = '#FF0000' // Red for Brutes
          break
        case 'spellsword':
          embedColor = '#0000FF' // Blue for spellswords
          break
        case 'stealth':
          embedColor = '#800080' // Purple for stealths
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
        const dice = currency.dice || 0

        const footerText = `Available: 🪙${gold} ⚡${energy} 🧿${gems} 🧪${ichor}`

        const statsEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(`Blood Hunter | Total Score: ${user.score}`)
          .addFields(
            {
              name: '-- Style Scores --',
              value: `\n**Brute**: ${user.brute_score}\n**Spellsword**: ${user.spellsword_score}\n**Stealth**: ${user.stealth_score}`,
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

        await interaction.reply({ embeds: [statsEmbed], ephemeral: true })
      } else {
        // Handle category-specific top cards
        const categoryField =
          category === 'monster' ? 'top_monsters' : `top_${category}s`
        const topCardsIds = user[categoryField] || []

        // Fetch top cards based on the category or overall selection
        const topCards = await Collection.findAll({
          where: { id: topCardsIds },
          attributes: ['name', 'm_score', 'level', 'copies', 'cr', 'type'],
          order: [['m_score', 'DESC']],
          limit: 3,
        })

        const categoryThumbnailMap = {
          brute: 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/bruteA.png', // Example URL for 'monster'
          spellsword: 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/spellswordA.png',
          stealth: 'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/stealthA.png',
          // Add more categories and corresponding URLs as needed
        };
        
        // Determine thumbnail based on the category, fallback to user's avatar if no match found
        const thumbnailUrl = categoryThumbnailMap[category] || interaction.user.displayAvatarURL();
        
        const statsEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(
            `Top ${
              category === 'monster'
                ? 'Overall'
                : category.charAt(0).toUpperCase() + category.slice(1)
            } Cards`
          )
          .setFooter({
            text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.gems} 🧪${user.currency.ichor}`,
          })
          .setThumbnail(thumbnailUrl);
        

        if (topCards.length > 0) {
          topCards.forEach((card) => {
            // const copiesNeeded = copiesNeededPerLevel[card.level] || 'Max'
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
                value: '`' + `${card.level} / 8` + '`',
                inline: true,
              },
              {
                name: 'Type',
                value: '`' + `${card.type}` + '`',
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

        await interaction.reply({ embeds: [statsEmbed], ephemeral: true })
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
