const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js')
const { huntPages } = require('../commands/huntPages.js')
const { createPageButtons } = require('./paginationHandler.js')

async function showLevelSelection(interaction, user, huntData) {
  const currentPage = user.unlockedPage || 'page1'
  const pageData = huntPages[currentPage]

  if (!pageData) {
    return interaction.reply({ content: 'Invalid hunt page!', ephemeral: true })
  }

  user.completedHunts = user.completedHunts || []

  const unlockedHunts = pageData.hunts.filter((hunt) => {
    return user.completedHunts.includes(hunt.key) || hunt.key === 'hunt1'
  })

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

  const pageButtonsRow =
    user.unlockedPages.length > 1
      ? createPageButtons(currentPage, user.unlockedPages)
      : null

  const embed = new EmbedBuilder()
    .setTitle(pageData.name)
    .setDescription(pageData.description)
    .setColor('Green')

  const components = [dropdownRow]

  if (pageButtonsRow) components.push(pageButtonsRow)

  await interaction.editReply({
    embeds: [embed],
    components: components,
    ephemeral: true,
  })
}

module.exports = {
  showLevelSelection,
}
