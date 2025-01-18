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
  console.log(
    `showLevelSelection() called for user: ${interaction.user.tag} (ID: ${interaction.user.id})`
  )

  const currentPage = user.unlockedPage || 'page1'
  const pageData = huntPages[currentPage]

  if (!pageData) {
    console.error('Invalid hunt page detected.')
    return interaction.editReply({
      content: 'Invalid hunt page.',
      ephemeral: true,
    })
  }

  console.log('Filtering available hunts based on user progress...')
  const unlockedHunts = pageData.hunts.filter(
    (hunt) => user.completedHunts.includes(hunt.key) || hunt.key === 'hunt1'
  )

  if (unlockedHunts.length === 0) {
    console.warn('No available hunts for user.')
    return interaction.editReply({
      content: 'No available hunts. Complete previous hunts first.',
      ephemeral: true,
    })
  }

  console.log('Creating hunt selection dropdown...')
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

  console.log('Creating action buttons...')
  const buttonComponents = []

  if (user.currency.ichor > 0 && !huntData.ichorUsed) {
    const ichorButton = new ButtonBuilder()
      .setCustomId('use_ichor')
      .setLabel('Drink Ichor')
      .setStyle(ButtonStyle.Success)
    buttonComponents.push(ichorButton)
  }

  const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_hunt')
    .setLabel('Cancel Hunt')
    .setStyle(ButtonStyle.Danger)
  buttonComponents.push(cancelButton)

  const buttonRow = new ActionRowBuilder().addComponents(...buttonComponents)

  const embed = new EmbedBuilder()
    .setTitle(pageData.name)
    .setDescription(pageData.description)
    .setColor('Green')
    .setFooter({
      text: `Available: ⚡${user.currency.energy} 🧪${user.currency.ichor}`,
    })

  await interaction.editReply({
    embeds: [embed],
    components: [dropdownRow, buttonRow],
    ephemeral: true,
  })

  console.log('Setting up interaction collector for hunt selection...')
  const filter = (i) => i.user.id === interaction.user.id
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    max: 1,
    time: 15000,
  })

  collector.on('collect', async (i) => {
    console.log(`User selected: ${i.customId}`)

    try {
      await i.deferUpdate()
    } catch (error) {
      console.error('Error deferring interaction:', error)
      return
    }

    if (i.customId === 'hunt_select') {
      console.log('Dropdown selection detected.')
      const selectedHuntKey = i.values[0].replace('hunt_', '')
      console.log(`Selected Hunt Key: ${selectedHuntKey}`)

      const selectedHunt = huntPages[user.unlockedPage].hunts.find(
        (hunt) => hunt.key === selectedHuntKey
      )

      if (!selectedHunt) {
        console.error('Invalid hunt selection.')
        return i.editReply({
          content: 'Invalid hunt selection.',
          ephemeral: true,
        })
      }

      huntData.level = selectedHunt
      huntData.currentBattleIndex = 0

      console.log(`Starting new encounter for: ${selectedHunt.name}`)
      const { startNewEncounter } = require('./encounterHandler.js')
      await startNewEncounter(interaction, user, huntData)
    }

    if (i.customId === 'cancel_hunt') {
      console.log('User canceled hunt.')
      return i.editReply({
        content: 'Hunt cancelled.',
        embeds: [],
        components: [],
      })
    }
  })

  collector.on('end', (collected, reason) => {
    console.log(
      `Hunt selection collector ended. Reason: ${reason}. Collected: ${collected.size}`
    )
  })
}

module.exports = { showLevelSelection }
