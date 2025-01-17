const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { Collection } = require('../../Models/model.js')

const { checkUserAccount } = require('../Account/checkAccount.js')
const { cacheHuntMonsters } = require('../../handlers/huntCacheHandler')
const { showLevelSelection } = require('./huntUtils/huntHandlers.js')
const { handlePagination } = require('./huntUtils/paginationHandler.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription('Embark on a hunt and engage in combat with a series of monsters'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true })

    const user = await checkUserAccount(interaction)
    if (!user) return

    user.unlockedPages = user.unlockedPages || ['page1']
    user.unlockedPage = user.unlockedPage || 'page1'
    user.completedHunts = user.completedHunts || []

    try {
      const userCollection = await Collection.findOne({ where: { userId: interaction.user.id } })

      if (!userCollection) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('No Monsters Found')
              .setDescription('You need at least one card to go on a hunt.\nUse `/shop` to receive a starter pack.')
          ],
        })
      }
    } catch (error) {
      console.error('Error querying Collection model:', error)
      return interaction.editReply({ content: 'Error accessing collection data.', ephemeral: true })
    }

    await cacheHuntMonsters()

    let huntData = {
      totalMonstersDefeated: 0,
      totalGoldEarned: 0,
      currentBattleIndex: 0,
      ichorUsed: false,
      level: null,
      retries: 0,
      lastMonster: null,
      inProgress: false,
    }

    await showLevelSelection(interaction, user, huntData)

    const filter = (i) => i.user.id === interaction.user.id
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 })

    collector.on('collect', async (i) => {
      await i.deferUpdate()
      if (i.customId.startsWith('prev_page_') || i.customId.startsWith('next_page_')) {
        await handlePagination(i, user)
      }
    })

    collector.on('end', () => console.log('Collector ended.'))
  },
}
