const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { Collection } = require('../../Models/model.js')
const { checkUserAccount } = require('../Account/helpers/checkAccount.js')
const { showLevelSelection } = require('./huntUtils/huntHandlers.js')
const { startNewEncounter } = require('./huntUtils/encounterHandler.js')
const { handlePagination } = require('./huntUtils/paginationHandler.js')
const { huntPages } = require('./huntPages.js')
const { populateMonsterCache } = require('../../handlers/cacheHandler')
const { collectors, stopUserCollector } = require('../../utils/collectors')
const { verifyAndUpdateUserScores } = require('../../utils/verifyUserScores.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hunt')
    .setDescription(
      'Embark on a hunt and engage in combat with a series of monsters'
    ),

  async execute(interaction) {
    // Only defer reply if this interaction has not already been acknowledged.
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true })
    }

    const user = await checkUserAccount(interaction)
    if (!user) {
      console.warn('User does not have an account.')
      return
    }

    stopUserCollector(interaction.user.id)
    await verifyAndUpdateUserScores(user.user_id)
    const highestUnlockedPage = Object.keys(huntPages).find(
      (pageKey, index) => {
        const totalHuntsBefore = Object.keys(huntPages)
          .slice(0, index)
          .reduce((sum, key) => sum + huntPages[key].hunts.length, 0)
        return user.completedLevels >= totalHuntsBefore
      }
    )

    user.unlockedPage = highestUnlockedPage || 'page1'
    user.completedHunts = user.completedHunts || []

    try {
      const userCollection = await Collection.findOne({
        where: { userId: interaction.user.id },
      })
      if (!userCollection) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('No Monsters Found')
              .setDescription(
                'You need at least one card to go on a hunt. Use `/shop` to receive a starter pack.'
              ),
          ],
        })
      }
    } catch (error) {
      console.error('Error querying Collection model:', error)
      return interaction.editReply({
        content: 'Error accessing collection data.',
        ephemeral: true,
      })
    }

    const loadingEmbed = new EmbedBuilder()
      .setColor(0xffcc00)
      .setDescription('Loading hunt data, please wait...')
    await interaction.editReply({ embeds: [loadingEmbed] })

    await populateMonsterCache()

    const huntData = {
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
    stopUserCollector(interaction.user.id)

    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000,
    })
    collectors.set(interaction.user.id, collector)

    collector.on('collect', async (i) => {
      if (i.customId === 'use_ichor') {
        await i.deferUpdate()
        if (user.currency.ichor < 1) {
          await interaction.followUp({
            content: "You don't have enough 🧪ichor to use this option.",
            ephemeral: true,
          })
          return
        }
        if (huntData.ichorUsed) {
          await interaction.followUp({
            content: 'You have already used Ichor for this hunt!',
            ephemeral: true,
          })
          return
        }
        user.currency.ichor -= 1
        user.changed('currency', true)
        await user.save()
        huntData.ichorUsed = true
        await showLevelSelection(interaction, user, huntData, user.id)
        return
      }

      if (i.customId === 'cancel_hunt') {
        let cancelMessage = 'Hunt cancelled.'
        if (huntData.ichorUsed) {
          user.currency.ichor += 1
          huntData.ichorUsed = false
          await user.save()
          cancelMessage += ' Your 🧪Ichor has been refunded.'
        }
        if (i.replied || i.deferred) {
          await i.editReply({ content: cancelMessage, components: [] })
        } else {
          await i.update({ content: cancelMessage, embeds: [], components: [] })
        }
        collector.stop()
        return
      }

      if (i.customId.startsWith('page_')) {
        const newPage = i.customId.replace('page_', '')
        await i.deferUpdate()
        await showLevelSelection(interaction, user, huntData, newPage)
        return
      }

      if (i.customId === 'hunt_select') {
        const selectedHuntKey = i.values[0].replace('hunt_', '')
        let selectedHunt = null
        let selectedPage = null

        for (const [pageKey, pageData] of Object.entries(huntPages)) {
          const hunt = pageData.hunts.find((h) => h.key === selectedHuntKey)
          if (hunt) {
            selectedHunt = hunt
            selectedPage = pageKey
            break
          }
        }

        if (!selectedHunt || !selectedPage) {
          console.error(`Error: Hunt '${selectedHuntKey}' not found.`)
          return i.reply({ content: 'Error: Hunt not found.', ephemeral: true })
        }

        if ((user.currency.energy || 0) < selectedHunt.energyCost) {
          const noEnergyEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Insufficient Energy')
            .setDescription(
              'You do not have enough energy to start a hunt. Energy regenerates every 10 minutes or you can try your luck in the /slots.'
            )
            .setFooter({
              text: `Available: ⚡${user.currency.energy} 🧪${user.currency.ichor}`,
            })
          await interaction.editReply({
            embeds: [noEnergyEmbed],
            components: [],
            ephemeral: true,
          })
          return
        }

        user.currency.energy -= selectedHunt.energyCost
        user.changed('currency', true)
        await user.save()

        try {
          if (!i.replied && !i.deferred) {
            await i.deferUpdate()
          }
        } catch (error) {
          console.warn(`deferUpdate failed: ${error.message}`)
        }

        const updatedUser = await checkUserAccount(interaction)
        const pageData = huntPages[selectedPage]
        const updatedEmbed = new EmbedBuilder()
          .setTitle(selectedHunt.name)
          .setDescription(
            `${pageData.description}\n\n⚡Energy cost is shown next to the monster's name.`
          )
          .setColor('Green')
          .setFooter({
            text: `Available: ⚡${updatedUser.currency.energy} 🧪${updatedUser.currency.ichor}`,
          })
        try {
          await i.editReply({ embeds: [updatedEmbed], components: [] })
        } catch (error) {
          console.warn(`editReply failed: ${error.message}`)
        }
        huntData.level = { ...selectedHunt, page: selectedPage }
        await startNewEncounter(interaction, updatedUser, huntData)
        return
      }

      if (
        i.customId.startsWith('prev_page_') ||
        i.customId.startsWith('next_page_')
      ) {
        await handlePagination(i, user)
      }
    })

    collector.on('end', async (_, reason) => {
      collectors.delete(interaction.user.id)
      if (reason === 'time') {
        try {
          await interaction.followUp({
            content:
              'Session expired. You did not select a fighting style in time. Please use /hunt to try again.',
            ephemeral: true,
          })
        } catch (error) {
          console.warn(`followUp failed: ${error.message}`)
        }
      }
    })
  },
}
