// buttonHandler.js

const handleSpecialtySelection = require('./specialtySelection')

module.exports = async function buttonHandler(interaction) {
  const customId = interaction.customId

  // Handle specialty selection
  if (['relic', 'cult', 'mythos'].includes(customId)) {
    await handleSpecialtySelection(interaction)
  }

  // Add other button types here
}
