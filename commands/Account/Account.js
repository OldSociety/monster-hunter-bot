const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { User, Collection } = require('../../Models/model.js')
const { collectors, stopUserCollector } = require('../../utils/collectors')
const { verifyAndUpdateUserScores } = require('../../utils/verifyUserScores.js')

const { Op } = require('sequelize')

function getRaritySymbol(cr) {
  if (cr >= 20) return '⭐⭐⭐⭐⭐' // Legendary
  if (cr >= 16) return '⭐⭐⭐⭐★' // Very Rare
  if (cr >= 11) return '⭐⭐⭐★★' // Rare
  if (cr >= 5) return '⭐⭐★★★' // Uncommon
  return '⭐★★★★' // Common
}

function createButtons(activePage) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('overview')
      .setLabel('Overview')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(activePage === 'overview'),
    new ButtonBuilder()
      .setCustomId('brute')
      .setLabel('Brute')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(activePage === 'brute'),
    new ButtonBuilder()
      .setCustomId('spellsword')
      .setLabel('Spellsword')
      .setStyle(ButtonStyle.Success)
      .setDisabled(activePage === 'spellsword'),
    new ButtonBuilder()
      .setCustomId('stealth')
      .setLabel('Stealth')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(activePage === 'stealth')
  )
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('account')
    .setDescription(
      'View your Blood Hunter game stats and collection progress'
    ),

  async execute(interaction) {
    const userId = interaction.user.id
    let category = interaction.options.getString('style') || 'overview'

    stopUserCollector(userId)
    await interaction.deferReply({ ephemeral: true })

    try {
      let user = await User.findOne({ where: { user_id: userId } })
      if (!user) {
        console.log(`Creating new user record for: ${userId}`)
        user = await User.create({
          user_id: userId,
          user_name: interaction.user.username,
          gold: 500,
          currency: { energy: 15, tokens: 0, eggs: 0, ichor: 3, gear: 0 },
          score: 0,
          brute_score: 10,
          spellsword_score: 10,
          stealth_score: 10,
          top_monsters: [],
          top_brutes: [],
          top_spellswords: [],
          top_stealths: [],
          completedLevels: 0,
        })

        const welcomeEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Welcome to Blood Hunter!')
          .setDescription(
            `You have joined the hunt!\n Use \`/shop\` to get your first card.`
          )
          .setFooter({
            text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
          })
          .setThumbnail(interaction.user.displayAvatarURL())

        return interaction.editReply({
          embeds: [welcomeEmbed],
          ephemeral: true,
        })
      }
      user = await verifyAndUpdateUserScores(userId)
      const displayEmbed = async (category) => {
        let embedColor =
          {
            brute: '#FF0000',
            spellsword: '#0000FF',
            stealth: '#800080',
            overview: '#00FF00',
          }[category] || '#00FF00'

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
                where: { userId: userId, ...condition },
              })
              return { rarity, count }
            })
          )

          const footerText = `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`

          const statsEmbed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`Blood Hunter | Total Score: ${user.score}`)
            .addFields({
              name: '-- Style Scores --',
              value: `\n**Brute**: ${user.brute_score}\n**Spellsword**: ${user.spellsword_score}\n**Stealth**: ${user.stealth_score}`,
              inline: true,
            })
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: footerText })

          rarityCounts.forEach(({ rarity, count }) => {
            const total = totalMonsters[rarity]
            const percentage = ((count / total) * 100).toFixed(1)
            statsEmbed.addFields({
              name: `${rarity}`,
              value: `\`${count} / ${total} ➜ (${percentage}%)\``,
              inline: false,
            })
          })

          return statsEmbed
        }

        const categoryField = `top_${category}s`
        const topCardsIds = user[categoryField] || []

        if (topCardsIds.length === 0) {
          console.log(`No cards found for category: ${category}`)
          return new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`No ${category} Cards Found`)
            .setDescription(
              `You currently have no cards in the ${category} category.`
            )
        }

        const topCards = await Collection.findAll({
          where: { id: topCardsIds },
          attributes: ['name', 'm_score', 'rank', 'copies', 'cr', 'type'],
          order: [['m_score', 'DESC']],
          limit: 3,
        })

        const statsEmbed = new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(
            `Top ${
              category.charAt(0).toUpperCase() + category.slice(1)
            } Cards (${user[`${category}_score`] || 0})`
          )

          .setFooter({
            text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
          })
          .setThumbnail(interaction.user.displayAvatarURL())

        topCards.forEach((card) => {
          statsEmbed.addFields(
            {
              name: `${card.name}`,
              value: `${getRaritySymbol(card.cr)}`,
              inline: false,
            },
            { name: 'Score', value: `\`${card.m_score}\``, inline: true },
            { name: 'Rank', value: `\`${card.rank} / 8\``, inline: true },
            { name: 'Type', value: `\`${card.type}\``, inline: true }
          )
        })

        return statsEmbed
      }

      await interaction.editReply({
        embeds: [await displayEmbed(category)],
        components: [createButtons(category)],
        ephemeral: true,
      })

      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === userId,
        time: 60000,
      })

      collectors.set(userId, collector)

      collector.on('collect', async (btnInteraction) => {
        await btnInteraction.deferUpdate()
        await btnInteraction.editReply({
          embeds: [await displayEmbed(btnInteraction.customId)],
          components: [createButtons(btnInteraction.customId)],
        })
      })
    } catch (error) {
      console.error('Error fetching user stats:', error)
      await interaction.editReply({
        content: 'An error occurred. Please try again later.',
        ephemeral: true,
      })
    }
  },
}
