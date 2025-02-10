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

  for (const [pageKey, pageData] of Object.entries(huntPages)) {
    if (completedLevels >= totalHuntsBefore) {
      unlockedPages.push(pageKey)
    }
    if (Array.isArray(pageData.hunts)) {
      totalHuntsBefore += pageData.hunts.length
    } else {
      console.error(`❌ Hunt page '${pageKey}' is missing a valid 'hunts' array.`)
    }
  }
  

  const highestUnlockedPage = unlockedPages[unlockedPages.length - 1] || 'page1'
  console.log(`🌍 Highest Unlocked Page: ${highestUnlockedPage}`)

  const currentPage =
    typeof newPage === 'string' ? newPage : highestUnlockedPage
  console.log(`📖 Current Page after button press: ${currentPage}`)

  const pageData = huntPages[currentPage]

  if (!pageData) {
    console.error(`❌ Invalid hunt page detected: ${currentPage}`)
    return interaction.editReply({
      content: 'Invalid hunt page.',
      ephemeral: true,
    })
  }

  totalHuntsBefore = Object.keys(huntPages)
    .slice(0, Object.keys(huntPages).indexOf(currentPage))
    .reduce((sum, key) => sum + huntPages[key].hunts.length, 0)

  let completedLevelsOnPage = completedLevels - totalHuntsBefore
  console.log(`✅ Completed levels on ${currentPage}: ${completedLevelsOnPage}`)


  const unlockedHunts = pageData.hunts.filter(
    (hunt) => hunt.id <= completedLevels + 1
  )

  console.log(
    `Unlocked hunts: ${unlockedHunts.map((h) => h.key).join(', ') || 'None'}`
  )

  if (unlockedHunts.length === 0) {
    return interaction.editReply({
      content:
        'No hunts are available on this page. Complete previous hunts to unlock new ones.',
      ephemeral: true,
    })
  }

  const huntOptions = unlockedHunts
    .map((hunt) => ({
      label: `${hunt.name} ${energyCostToEmoji(hunt.energyCost)}`,
      description: hunt.description,
      value: `hunt_${hunt.key}`,
    }))
    .reverse()

  const dropdownRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('hunt_select')
      .setPlaceholder('Choose a hunt')
      .addOptions(huntOptions)
  )

  let pageRow = null
  if (unlockedPages.length > 1) {
    console.log(`🔄 Adding page-switching buttons: ${unlockedPages}`)

    pageRow = new ActionRowBuilder().addComponents(
      unlockedPages.map((pageKey) =>
        new ButtonBuilder()
          .setCustomId(`page_${pageKey}`)
          .setLabel(`Page ${pageKey.replace('page', '')}`)
          .setStyle(
            pageKey === currentPage
              ? ButtonStyle.Primary
              : ButtonStyle.Secondary
          )
      )
    )
  }

  const buttonRow = new ActionRowBuilder().addComponents(
    ...(user.currency.ichor > 0 && !huntData.ichorUsed
      ? [
          new ButtonBuilder()
            .setCustomId('use_ichor')
            .setLabel('Drink Ichor')
            .setStyle(ButtonStyle.Success),
        ]
      : []),
    new ButtonBuilder()
      .setCustomId('cancel_hunt')
      .setLabel('Cancel Hunt')
      .setStyle(ButtonStyle.Danger)
  )

  const embed = new EmbedBuilder()
    .setTitle(pageData.name)
    .setDescription(
      `${pageData.description}\n\n⚡Energy cost is shown next to the monster's name.`
    )
    .setColor('Green')
    .setFooter({
      text: `Available: ⚡${user.currency.energy} 🧪${user.currency.ichor}`,
    })

  if (huntData.ichorUsed) {
    embed.addFields({
      name: 'Ichor Invigoration',
      value: 'You are invigorated with 🧪ichor! Your strength increases.',
    })
  }

  const components = [dropdownRow]
  if (pageRow) components.push(pageRow)
  components.push(buttonRow)

  await interaction.editReply({
    embeds: [embed],
    components,
    ephemeral: true,
  })

  console.log('Setting up interaction collector for hunt selection...')
}

module.exports = { showLevelSelection }
