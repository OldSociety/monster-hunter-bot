const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
let cacheMonstersByTier

(async () => {
  const module = await import('../../handlers/pullHandler.js')
  cacheMonstersByTier = module.cacheMonstersByTier
})()

let monsterListCache = [] // Cache for monster data

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('(ADMIN) Lists monsters by CR tier, name, or type')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('type')
        .setDescription('Lists monsters by type')
        .addStringOption((option) =>
          option
            .setName('monstertype')
            .setDescription('Specify a monster type to list all monsters within it')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(process.env.ADMINROLEID)) {
      return interaction.reply({
        content: 'You do not have permission to run this command.',
        ephemeral: true,
      })
    }
    await interaction.deferReply()

    const fetch = (await import('node-fetch')).default
    const monsterType = interaction.options.getString('monstertype')?.toLowerCase()
    const monstersPerPage = 20

    async function cacheMonsterList() {
      if (monsterListCache.length === 0) {
        const response = await fetch('https://www.dnd5eapi.co/api/monsters')
        const data = await response.json()
        monsterListCache = data.results
      }
    }

    async function processMonsterDetails() {
      for (const monster of monsterListCache) {
        if (monster.challenge_rating === undefined) {
          const detailResponse = await fetch(`https://www.dnd5eapi.co/api/monsters/${monster.index}`)
          const monsterDetails = await detailResponse.json()
          monster.challenge_rating = monsterDetails.challenge_rating ?? 0
          monster.type = monsterDetails.type || 'unknown'
        }
      }
    }

    await cacheMonsterList()
    await processMonsterDetails()

    // Show monsters in the specified type with pagination
    const monstersInType = monsterListCache
      .filter((monster) => monster.type?.toLowerCase() === monsterType)
      .map((monster) => ({ name: monster.name, cr: monster.challenge_rating }))

    if (monstersInType.length === 0) {
      return interaction.editReply({
        content: `No monsters found of type "${monsterType}"`,
      })
    }

    // Initialize pagination
    let currentPage = 0

    const createEmbed = (page) => {
      const paginatedMonsters = monstersInType.slice(page * monstersPerPage, (page + 1) * monstersPerPage)
      const embed = new EmbedBuilder()
        .setTitle(`Monsters of Type: ${monsterType.charAt(0).toUpperCase() + monsterType.slice(1)}`)
        .setColor(0x00bfff)
        .setFooter({ text: `Page ${page + 1} of ${Math.ceil(monstersInType.length / monstersPerPage)}` })

      paginatedMonsters.forEach((monster) => {
        embed.addFields({
          name: `${monster.name}`,
          value: `CR: ${monster.cr}`,
          inline: true,
        })
      })

      return embed
    }

    const getRow = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled((page + 1) * monstersPerPage >= monstersInType.length),
        new ButtonBuilder()
          .setCustomId('finish')
          .setLabel('Finish')
          .setStyle(ButtonStyle.Danger)
      )
    }

    await interaction.editReply({ embeds: [createEmbed(currentPage)], components: [getRow(currentPage)] })

    const collector = interaction.channel.createMessageComponentCollector({ time: 60000 })

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return buttonInteraction.reply({ content: "This navigation isn't for you.", ephemeral: true })
      }

      if (buttonInteraction.customId === 'finish') {
        collector.stop('finished')
        return
      }

      currentPage += buttonInteraction.customId === 'next' ? 1 : -1

      // Update the interaction with a new embed and buttons, clearing the previous one
      await buttonInteraction.update({
        embeds: [createEmbed(currentPage)],
        components: [getRow(currentPage)],
      })
    })

    collector.on('end', async () => {
      // Clear the components after interaction ends
      await interaction.editReply({
        embeds: [createEmbed(currentPage).setFooter({ text: 'Session ended.' })],
        components: [],
      })
    })
  },
}
