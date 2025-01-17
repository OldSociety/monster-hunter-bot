const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
  } = require('discord.js')
  const { huntPages } = require('../huntPages.js')
  const { createPageButtons } = require('./paginationHandler.js')
  
  async function showLevelSelection(interaction, user, huntData) {
    user.unlockedPage = user.unlockedPage || 'page1'
    user.unlockedPages = user.unlockedPages || ['page1']
    user.completedHunts = user.completedHunts || []
  
    const currentPage = user.unlockedPage
    const pageData = huntPages[currentPage]
  
    if (!pageData) {
      return interaction.reply({ content: 'Invalid hunt page.', ephemeral: true })
    }
  
    // Filter available hunts based on user progress
    const unlockedHunts = pageData.hunts.filter(
      (hunt) => user.completedHunts.includes(hunt.key) || hunt.key === 'hunt1'
    )
  
    if (!unlockedHunts.length) {
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
  
    // Add pagination buttons if multiple pages are unlocked
    const components = [dropdownRow]
    if (user.unlockedPages.length > 1) {
      components.push(createPageButtons(currentPage, user.unlockedPages))
    }
  
    // Construct the hunt selection embed
    const embed = new EmbedBuilder()
      .setTitle(pageData.name)
      .setDescription(pageData.description)
      .setColor('Green')
  
    await interaction.editReply({ embeds: [embed], components, ephemeral: true })
  }
  
  module.exports = { showLevelSelection }
  