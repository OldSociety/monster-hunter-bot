const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { huntPages } = require('../huntPages.js')
const { energyCostToEmoji } = require('./huntHelpers.js')

async function showLevelSelection(interaction, user, huntData) {
  console.log(
    `showLevelSelection() called for user: ${interaction.user.tag} (ID: ${interaction.user.id})`
  )

  // ✅ Ensure completedLevels is initialized
  let completedLevels = user.completedLevels || 0

  // ✅ Dynamically determine unlocked pages based on completed levels
  let unlockedPages = []
  let totalHuntsBefore = 0

  for (const [pageKey, pageData] of Object.entries(huntPages)) {
    if (completedLevels >= totalHuntsBefore) {
      unlockedPages.push(pageKey)
    }
    totalHuntsBefore += pageData.hunts.length // ✅ Tracks cumulative hunt counts
  }

  const highestUnlockedPage = unlockedPages[unlockedPages.length - 1] || 'page1'
  console.log(`🌍 Highest Unlocked Page: ${highestUnlockedPage}`)

  // ✅ Ensure the user is on the highest unlocked page by default
  const currentPage = user.unlockedPage || highestUnlockedPage
  const pageData = huntPages[currentPage]

  console.log(`📖 Current Page: ${currentPage}`)

  if (!pageData) {
    console.error(`❌ Invalid hunt page detected: ${currentPage}`)
    return interaction.editReply({
      content: 'Invalid hunt page.',
      ephemeral: true,
    })
  }

  console.log(`✅ Completed levels: ${completedLevels}`)

  // ✅ Only show hunts that are unlocked within the current page
  const unlockedHunts = pageData.hunts.filter((hunt) => {
    const huntNumber = parseInt(hunt.key.replace('hunt', ''), 10)
    return huntNumber <= completedLevels + 1
  })

  console.log(`Unlocked hunts: ${unlockedHunts.map((h) => h.key).join(', ')}`)

  // ✅ Create dropdown options
  const huntOptions = unlockedHunts.map((hunt) => ({
    label: `${hunt.name}${energyCostToEmoji(hunt.energyCost)}`, // ✅ Adds ⚡ next to hunt name
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

  // ✅ Generate page buttons (up to 3 at a time, with next/prev controls)
  let pageRow = null
  if (unlockedPages.length > 1) {
    console.log(`🔄 Adding page-switching buttons: ${unlockedPages}`)

    const buttons = unlockedPages.map((pageKey) =>
      new ButtonBuilder()
        .setCustomId(`page_${pageKey}`)
        .setLabel(`Page ${pageKey.replace('page', '')}`)
        .setStyle(pageKey === currentPage ? ButtonStyle.Primary : ButtonStyle.Secondary)
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

  const components = [dropdownRow]
  if (pageRow) components.push(pageRow)
  components.push(buttonRow) // ✅ Page buttons above Ichor/Cancel buttons

  await interaction.editReply({
    embeds: [embed],
    components: components,
    ephemeral: true,
  })

  console.log('Setting up interaction collector for hunt selection...')
}

module.exports = { showLevelSelection }
