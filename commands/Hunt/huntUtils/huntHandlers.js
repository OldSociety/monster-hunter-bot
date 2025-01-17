const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { huntPages } = require('../huntPages.js')
const { createPageButtons } = require('./paginationHandler.js')

async function showLevelSelection(interaction, user, huntData) {
  const currentPage = user.unlockedPage || 'page1'
  const pageData = huntPages[currentPage]

  if (!pageData) {
    return interaction.reply({ content: 'Invalid hunt page.', ephemeral: true })
  }

  user.completedHunts = user.completedHunts || []

  // Filter available hunts based on user progress
  const unlockedHunts = pageData.hunts.filter(
    (hunt) => user.completedHunts.includes(hunt.key) || hunt.key === 'hunt1'
  )

  if (unlockedHunts.length === 0) {
    return interaction.editReply({
      content: 'No available hunts. Complete previous hunts first.',
      ephemeral: true,
    })
  }

  // Create hunt selection dropdown
  const huntOptions = unlockedHunts.map((hunt) => ({
    label: hunt.name,
    description: hunt.description,
    value: `hunt_${hunt.key}`,
  }))

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('hunt_select')
    .setPlaceholder('Choose a hunt')
    .addOptions(huntOptions)

  const dropdownRow = new ActionRowBuilder().addComponents(selectMenu)

  // Create Ichor boost button (if user has ichor and hasn't used it)
  const buttonComponents = []
  if (user.currency.ichor > 0 && !huntData.ichorUsed) {
    const ichorButton = new ButtonBuilder()
      .setCustomId('use_ichor')
      .setLabel('Drink Ichor')
      .setStyle(ButtonStyle.Success)
    buttonComponents.push(ichorButton)
  }

  // Cancel button to exit the hunt selection
  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_hunt')
    .setLabel('Cancel Hunt')
    .setStyle(ButtonStyle.Danger)
  buttonComponents.push(cancelButton)

  const buttonRow = new ActionRowBuilder().addComponents(...buttonComponents)

  // Create pagination buttons if multiple pages are unlocked
  const pageButtonsRow =
    user.unlockedPages.length > 1
      ? createPageButtons(currentPage, user.unlockedPages)
      : null

  // Construct the hunt selection embed
  const embed = new EmbedBuilder()
    .setTitle(pageData.name)
    .setDescription(pageData.description)
    .setColor('Green')
    .setFooter({ text: `Available: ⚡${user.currency.energy} 🧪${user.currency.ichor}` })

  const components = [dropdownRow, buttonRow]
  if (pageButtonsRow) components.push(pageButtonsRow)

  await interaction.editReply({
    embeds: [embed],
    components,
    ephemeral: true,
  })

  // Collector to handle user interaction with buttons and dropdown
  const filter = (i) => i.user.id === interaction.user.id
  const collector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 15000 })

  collector.on('collect', async (i) => {
    await i.deferUpdate()

    // Handle Ichor consumption
    if (i.customId === 'use_ichor') {
      if (user.currency.ichor < 1) {
        return interaction.followUp({ content: "You don't have enough Ichor.", ephemeral: true })
      }

      user.currency.ichor -= 1
      user.changed('currency', true)
      await user.save()

      huntData.ichorUsed = true

      // Refresh selection with Ichor boost applied
      await showLevelSelection(interaction, user, huntData)
    }

    // Handle hunt selection
    if (i.customId === 'hunt_select') {
      const selectedHuntKey = i.values[0].replace('hunt_', '')
      const selectedHunt = huntPages[user.unlockedPage].hunts.find(hunt => hunt.key === selectedHuntKey)

      if (!selectedHunt) {
        return interaction.followUp({ content: 'Invalid hunt selection.', ephemeral: true })
      }

      huntData.level = selectedHunt
      huntData.currentBattleIndex = 0

      const { startNewEncounter } = require('./encounterHandler.js')
      await startNewEncounter(interaction, user, huntData)
    }

    // Handle hunt cancellation
    if (i.customId === 'cancel_hunt') {
      await interaction.editReply({ content: 'Hunt cancelled.', embeds: [], components: [] })
    }
  })

  collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      await interaction.editReply({ content: 'Selection timed out.', embeds: [], components: [] })
    }
  })
}

module.exports = {
  showLevelSelection,
}
