const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
  } = require('discord.js')
  const { huntPages } = require('../huntPages.js')

  function createPageButtons(currentPage, unlockedPages) {
    const buttons = []
    const pageKeys = Object.keys(huntPages)
  
    const currentIndex = pageKeys.indexOf(currentPage)
  
    if (currentIndex > 0) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`prev_page_${pageKeys[currentIndex - 1]}`)
          .setLabel('⬅️ Previous Page')
          .setStyle(ButtonStyle.Primary)
      )
    }
  
    if (currentIndex < pageKeys.length - 1 && unlockedPages.includes(pageKeys[currentIndex + 1])) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`next_page_${pageKeys[currentIndex + 1]}`)
          .setLabel('Next Page ➡️')
          .setStyle(ButtonStyle.Primary)
      )
    }
  
    if (buttons.length === 0) {
      return [] // Return an empty array instead of an empty ActionRow
    }
  
    return new ActionRowBuilder().addComponents(buttons)
  }
  

module.exports = { createPageButtons }
