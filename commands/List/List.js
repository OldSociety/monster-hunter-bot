const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { checkUserAccount } = require('../Account/helpers/checkAccount.js')
const { Monster } = require('../../Models/model.js')
const fs = require('fs')
const path = require('path')

const assetsPath = path.join(__dirname, '..', '..', 'assets')
const creatureFiles = fs.readdirSync(assetsPath)
const validCreatures = new Set(
  creatureFiles.map((filename) => path.parse(filename).name)
)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('(ADMIN) Lists monsters by CR tier, name, or type')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('filter')
        .setDescription('Lists monsters by type and/or CR')
        .addStringOption((option) =>
          option
            .setName('monstertype')
            .setDescription('Specify a monster type')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('cr')
            .setDescription('Specify a challenge rating or "all"')
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('hp')
            .setDescription('Base HP value to search for')
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('hp_range')
            .setDescription('HP range (e.g., ±10)')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('missing')
        .setDescription('Lists monsters missing from the assets folder')
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(process.env.ADMINROLEID)) {
      return interaction.reply({
        content: 'You do not have permission to run this command.',
        ephemeral: true,
      })
    }

    await interaction.deferReply()
    const user = await checkUserAccount(interaction)
    if (!user) return

    const subcommand = interaction.options.getSubcommand()
    if (subcommand === 'missing') {
      return await listMissingMonsters(interaction)
    } else if (subcommand === 'filter') {
      return await listFilteredMonsters(interaction)
    }
  },
}

async function listMissingMonsters(interaction) {
  try {
    const storedMonsters = await Monster.findAll({ attributes: ['index'] })
    const storedIndexes = new Set(storedMonsters.map((m) => m.index))

    const missingMonsters = [...storedIndexes]
      .filter((index) => !validCreatures.has(index))
      .map((index) => ({
        name: index.replace(/-/g, ' '),
        index,
      }))

    if (missingMonsters.length === 0) {
      return interaction.editReply({ content: 'No missing monsters found.' })
    }

    return paginateResults(interaction, missingMonsters, 'Missing Monsters')
  } catch (error) {
    console.error('[DB] Error fetching missing monsters:', error.message)
    return interaction.editReply({
      content: 'Error fetching missing monsters.',
    })
  }
}

async function listFilteredMonsters(interaction) {
  const monsterType = interaction.options
    .getString('monstertype')
    ?.toLowerCase()
  const crFilter = interaction.options.getString('cr')
  const hp = interaction.options.getInteger('hp')
  const hpRange = interaction.options.getInteger('hp_range')

  try {
    let whereCondition = {}
    if (monsterType) whereCondition.type = monsterType
    if (crFilter) whereCondition.cr = parseFloat(crFilter)
    if (hp !== null)
      whereCondition.hp = { gte: hp - (hpRange || 0), lte: hp + (hpRange || 0) } // Handle HP range

    const filteredMonsters = await Monster.findAll({ where: whereCondition })

    if (filteredMonsters.length === 0) {
      return interaction.editReply({
        content: 'No monsters found with the specified filters.',
      })
    }

    return paginateResults(interaction, filteredMonsters, 'Filtered Monsters')
  } catch (error) {
    console.error('[DB] Error fetching filtered monsters:', error.message)
    return interaction.editReply({ content: 'Error filtering monsters.' })
  }
}

async function paginateResults(interaction, monsters, title) {
  let currentPage = 0
  const monstersPerPage = 10

  const createEmbed = (page) => {
    const paginatedMonsters = monsters.slice(
      page * monstersPerPage,
      (page + 1) * monstersPerPage
    )

    const embed = new EmbedBuilder()
      .setTitle(`${title} (${monsters.length})`)
      .setColor(0x00bfff)
      .setFooter({
        text: `Page ${page + 1} of ${Math.ceil(
          monsters.length / monstersPerPage
        )}`,
      })

    paginatedMonsters.forEach((monster) => {
      embed.addFields({
        name: `${monster.name}`,
        value: `Type: ${monster.type} | CR: ${monster.cr} | HP: ${monster.hp}`,
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
        .setDisabled((page + 1) * monstersPerPage >= monsters.length),
      new ButtonBuilder()
        .setCustomId('finish')
        .setLabel('Finish')
        .setStyle(ButtonStyle.Danger)
    )
  }

  await interaction.editReply({
    embeds: [createEmbed(currentPage)],
    components: [getRow(currentPage)],
  })

  const collector = interaction.channel.createMessageComponentCollector({
    time: 60000,
  })

  collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      return buttonInteraction.reply({
        content: "This navigation isn't for you.",
        ephemeral: true,
      })
    }

    if (buttonInteraction.customId === 'finish') {
      collector.stop('finished')
      return
    }

    currentPage += buttonInteraction.customId === 'next' ? 1 : -1

    await buttonInteraction.update({
      embeds: [createEmbed(currentPage)],
      components: [getRow(currentPage)],
    })
  })

  collector.on('end', async () => {
    await interaction.editReply({
      embeds: [createEmbed(currentPage).setFooter({ text: 'Session ended.' })],
      components: [],
    })
  })
}
