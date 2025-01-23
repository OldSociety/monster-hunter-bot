// huntHandlers.js 

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { huntPages } = require('../huntPages.js')
const { energyCostToEmoji } = require('./huntHelpers.js')

async function showLevelSelection(interaction, user, huntData, newPage = null) {
  console.log(
    `showLevelSelection() called for user: ${interaction.user.tag} (ID: ${interaction.user.id})`
  )

  let completedLevels = user.completedLevels || 0
  let totalHuntsBefore = 0
  let unlockedPages = []

  // ✅ Determine unlocked pages based on completed levels
  for (const [pageKey, pageData] of Object.entries(huntPages)) {
    if (completedLevels >= totalHuntsBefore) {
      unlockedPages.push(pageKey)
    }
    totalHuntsBefore += pageData.hunts.length // Count total hunts before each page
  }

  const highestUnlockedPage = unlockedPages[unlockedPages.length - 1] || 'page1'
  console.log(`🌍 Highest Unlocked Page: ${highestUnlockedPage}`)

  // ✅ Set the current page based on button press or highest unlocked page
  const currentPage = typeof newPage === 'string' ? newPage : highestUnlockedPage
  console.log(`📖 Current Page after button press: ${currentPage}`)

  const pageData = huntPages[currentPage]

  if (!pageData) {
    console.error(`❌ Invalid hunt page detected: ${currentPage}`)
    return interaction.editReply({
      content: 'Invalid hunt page.',
      ephemeral: true,
    })
  }

  // ✅ Reset totalHuntsBefore to properly count previous page hunts
  totalHuntsBefore = 0
  for (const [pageKey, pageData] of Object.entries(huntPages)) {
    if (pageKey === currentPage) break // Stop counting when we reach the current page
    totalHuntsBefore += pageData.hunts.length
  }

  // ✅ Determine how many hunts are unlocked within the current page
  let completedLevelsOnPage = completedLevels - totalHuntsBefore
  console.log(`✅ Completed levels on ${currentPage}: ${completedLevelsOnPage}`)

  // ✅ Correctly filter hunts available on the current page
  const unlockedHunts = pageData.hunts.filter((hunt, index) => index < completedLevelsOnPage + 1)

  console.log(`Unlocked hunts: ${unlockedHunts.map((h) => h.key).join(', ') || 'None'}`)

  if (unlockedHunts.length === 0) {
    return interaction.editReply({
      content: 'No hunts are available on this page. Complete previous hunts to unlock new ones.',
      ephemeral: true,
    })
  }

  // ✅ Dropdown menu for available hunts
  const huntOptions = unlockedHunts.map((hunt) => ({
    label: `${hunt.name}${energyCostToEmoji(hunt.energyCost)}`,
    description: hunt.description,
    value: `hunt_${hunt.key}`,
  }))

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('hunt_select')
    .setPlaceholder('Choose a hunt')
    .addOptions(huntOptions)

  const dropdownRow = new ActionRowBuilder().addComponents(selectMenu)

  console.log('Creating action buttons...')
  const buttonComponents = []

  if (user.currency.ichor > 0 && !huntData.ichorUsed) {
    buttonComponents.push(
      new ButtonBuilder()
        .setCustomId('use_ichor')
        .setLabel('Drink Ichor')
        .setStyle(ButtonStyle.Success)
    )
  }

  buttonComponents.push(
    new ButtonBuilder()
      .setCustomId('cancel_hunt')
      .setLabel('Cancel Hunt')
      .setStyle(ButtonStyle.Danger)
  )

  const buttonRow = new ActionRowBuilder().addComponents(...buttonComponents)

  // ✅ Generate page-switching buttons
  let pageRow = null
  if (unlockedPages.length > 1) {
    console.log(`🔄 Adding page-switching buttons: ${unlockedPages}`)

    const buttons = unlockedPages.map((pageKey) =>
      new ButtonBuilder()
        .setCustomId(`page_${pageKey}`)
        .setLabel(`Page ${pageKey.replace('page', '')}`)
        .setStyle(
          pageKey === currentPage ? ButtonStyle.Primary : ButtonStyle.Secondary
        )
    )

    pageRow = new ActionRowBuilder().addComponents(...buttons)
  }

  const embed = new EmbedBuilder()
    .setTitle(pageData.name)
    .setDescription(
      `${pageData.description}\n\n⚡Energy cost is shown next to the monster's name.`
    )
    .setColor('Green')
    .setFooter({
      text: `Available: ⚡${user.currency.energy} 🧪${user.currency.ichor}`,
    })

  const components = []
  if (pageRow) components.push(pageRow)
  components.push(dropdownRow, buttonRow)

  await interaction.editReply({
    embeds: [embed],
    components: components,
    ephemeral: true,
  })

  console.log('Setting up interaction collector for hunt selection...')
}

module.exports = { showLevelSelection }
