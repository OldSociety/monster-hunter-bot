const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { User, Collection } = require('../../Models/model.js')
const { Op } = require('sequelize')

function getRaritySymbol(cr) {
  if (cr >= 20) return '⭐⭐⭐⭐⭐'
  if (cr >= 16) return '⭐⭐⭐⭐★'
  if (cr >= 11) return '⭐⭐⭐★★'
  if (cr >= 5) return '⭐⭐★★★'
  return '⭐★★★★'
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
    .setDescription('View your Blood Hunter game stats and collection progress'),

  async execute(interaction) {
    const userId = interaction.user.id
    let category = interaction.options.getString('style') || 'overview'

    await interaction.deferReply({ ephemeral: true })

    try {
      let user = await User.findOne({ where: { user_id: userId } })
      if (!user) {
        user = await User.create({
          user_id: userId,
          user_name: interaction.user.username,
          gold: 500,
          currency: { energy: 15, tokens: 0, eggs: 0, ichor: 3, dice: 0 },
          score: 0,
          brute_score: 0,
          spellsword_score: 0,
          stealth_score: 0,
          top_brutes: [],
          top_spellswords: [],
          top_stealths: [],
          completedLevels: 0,
        })

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle('Welcome to Blood Hunter!')
              .setDescription(`You have joined the hunt! Use \`/shop\` to get your first card.`)
              .setFooter({
                text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
              })
              .setThumbnail(interaction.user.displayAvatarURL()),
          ],
          ephemeral: true,
        })
      }

      const displayEmbed = async (category) => {
        let embedColor = {
          brute: '#FF0000',
          spellsword: '#0000FF',
          stealth: '#800080',
          overview: '#00FF00',
        }[category] || '#00FF00'

        if (category === 'overview') {
          return new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`Blood Hunter | Total Score: ${user.score}`)
            .addFields(
              {
                name: '-- Style Scores --',
                value: `\n**Brute**: ${user.brute_score}\n**Spellsword**: ${user.spellsword_score}\n**Stealth**: ${user.stealth_score}`,
                inline: true,
              }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({
              text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
            })
        }

        // Ensure correct category mapping
        const categoryField = `top_${category}s`
        const topCardsIds = Array.isArray(user[categoryField]) ? user[categoryField] : []

        if (topCardsIds.length === 0) {
          return new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(`No ${category} Cards Found`)
            .setDescription(`You currently have no cards in the ${category} category.`)
        }

        // 🔥 Fetch full details from `Collection` table
        const topCards = await Collection.findAll({
          where: { id: topCardsIds },
          attributes: ['name', 'm_score', 'rank', 'copies', 'cr'],
          order: [['m_score', 'DESC']],
          limit: 3,
        })

        let formattedCards = ''
        for (const card of topCards) {
          formattedCards += `**${card.name}**\n`
          formattedCards += `${getRaritySymbol(card.cr)}\n`
          formattedCards += `**Score:** ${card.m_score}\n`
          formattedCards += `**Level:** ${card.rank} / 7\n`
          formattedCards += `**Copies:** ${card.copies}\n\n`
        }

        return new EmbedBuilder()
          .setColor(embedColor)
          .setTitle(`Top ${category.charAt(0).toUpperCase() + category.slice(1)} Cards`)
          .setDescription(formattedCards || `You have no ${category} cards.`)
          .setFooter({
            text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
          })
          .setThumbnail(interaction.user.displayAvatarURL())
      }

      const message = await interaction.editReply({
        embeds: [await displayEmbed(category)],
        components: [createButtons(category)],
        ephemeral: true,
      })

      const collector = message.createMessageComponentCollector({
        filter: (i) => i.user.id === userId,
        time: 60000,
      })

      collector.on('collect', async (btnInteraction) => {
        console.log(`[DEBUG] Button Clicked: ${btnInteraction.customId}`)
        await btnInteraction.update({
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
