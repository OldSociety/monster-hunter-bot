const { huntPages } = require('../huntPages.js')

function createPageButtons(currentPage, unlockedPages) {
  return unlockedPages.map((page) => ({
    type: 2, // Button
    label: page === currentPage ? `[${page}]` : page,
    style: 1, // Primary
    custom_id: `page_${page}`,
  }))
}

async function handlePagination(interaction, user) {
  const newPage = interaction.customId.split('_')[1]

  if (!huntPages[newPage]) {
    return interaction.reply({
      content: 'Invalid page selection.',
      ephemeral: true,
    })
  }

  user.unlockedPage = newPage
  await showLevelSelection(interaction, user, {})
}

module.exports = { createPageButtons, handlePagination }
