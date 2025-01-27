// paginationHandler.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { huntPages } = require('../huntPages.js')

function createPageButtons(currentPage, completedLevels) {
  const availablePages = Object.keys(huntPages).filter((pageKey) => {
    const huntsOnPage = huntPages[pageKey].hunts.length
    const minRequiredLevels =
      Object.keys(huntPages).indexOf(pageKey) * huntsOnPage
    return completedLevels >= minRequiredLevels
  })

  console.log(
    `🛠️ Generating page buttons. Available: ${availablePages.join(', ')}`
  )

  const buttons = availablePages.map((page) =>
    new ButtonBuilder()
      .setCustomId(`page_${page}`)
      .setLabel(page === currentPage ? `[${page}]` : page)
      .setStyle(ButtonStyle.Primary)
  )

  return new ActionRowBuilder().addComponents(buttons)
}

async function handlePagination(interaction, user) {
  const newPage = interaction.customId.split('_')[1]

  if (!huntPages[newPage]) {
    return interaction.reply({
      content: 'Invalid page selection.',
      ephemeral: true,
    })
  }

  console.log(`📖 Switching hunt selection to ${newPage}`)

  const { showLevelSelection } = require('./huntHandlers.js')
  await interaction.deferUpdate() // 🔹 Ensures Discord updates UI
  await showLevelSelection(interaction, user, huntData, newPage)
}

module.exports = { handlePagination, createPageButtons }
