const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { checkUserAccount } = require('../Account/helpers/checkAccount.js')
const { updateTop3AndUserScore } = require('../../handlers/topCardsManager')
const { Collection, Monster } = require('../../Models/model.js')
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
    )
    .addSubcommand((sc) =>
      sc
        .setName('collection')
        .setDescription('Show your card collection')
        .addStringOption((opt) =>
          opt
            .setName('sort')
            .setDescription('alpha | type')
            .addChoices(
              { name: 'alphabetical', value: 'alpha' },
              { name: 'by‑type', value: 'type' }
            )
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand()

    // admin‑gate only for maintenance subs
    if (
      ['filter', 'missing'].includes(sub) &&
      !interaction.member.roles.cache.has(process.env.ADMINROLEID)
    ) {
      return interaction.reply({ content: 'No permission.', ephemeral: true })
    }

    await interaction.deferReply({ ephemeral: true })

    if (sub === 'collection') return listUserCollection(interaction)
    if (sub === 'filter') return listFilteredMonsters(interaction)
    if (sub === 'missing') return listMissingMonsters(interaction)
  },
}

async function listUserCollection(interaction) {
  const sortMode = interaction.options.getString('sort') || 'alpha'
  const user     = await checkUserAccount(interaction)
  if (!user) return

  const cards = await Collection.findAll({ where: { userId: user.user_id } })
  if (!cards.length)
    return interaction.editReply({ content: 'You own no cards yet.' })

  // ── pull every matching Monster → combatType
  const monsterRows = await Monster.findAll({
    where: { name: cards.map(c => c.name) },        // or 'index', adjust as needed
    attributes: ['name', 'combatType'],
  })
  const combatMap = new Map(
    monsterRows.map(m => [m.name.toLowerCase(), m.combatType])
  )

  // attach combatType to each card for easy access later
  cards.forEach(c => {
    c.combatType = combatMap.get(c.name.toLowerCase()) || 'unknown'
  })

  // scores remain unchanged …
  const typeScore = {
    brute:       user.brute_score,
    spellsword:  user.spellsword_score,
    stealth:     user.stealth_score,
  }

  // sort cards – use combatType when the user asked for /sort:type
  cards.sort((a, b) => {
    if (sortMode === 'type') {
      return (
        a.combatType.localeCompare(b.combatType, undefined, { sensitivity: 'base' }) ||
        a.name.localeCompare(b.name)
      )
    }
    return a.name.localeCompare(b.name)
  })

  return paginateCollection(interaction, cards, typeScore, sortMode)
}


async function paginateCollection(interaction, cards, typeScore, sortMode) {
  const perPage = 10
  let page = 0

  const makeEmbed = (p) => {
    const slice = cards.slice(p * perPage, (p + 1) * perPage)

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Cards (${cards.length})`)
      .setDescription(
        `**Current Scores** – Brute ${typeScore.brute} | ` +
          `Spellsword ${typeScore.spellsword} | Stealth ${typeScore.stealth}\n` +
          `Sorted by **${sortMode === 'alpha' ? 'name' : 'type'}**`
      )
      .setColor(0x4caf50)
      .setFooter({
        text: `Page ${page + 1} of ${Math.ceil(cards.length / perPage)}`,
      })

      slice.forEach(c =>
        embed.addFields({
          name: c.name,
          value:
            `Type: ${c.combatType} • Rank: ${c.rank} ` +
            `• Score: ${c.m_score} • Copies: ${c.copies}`,
          inline: true,
        })
      )

    return embed
  }

  const getRow = (p) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p === 0),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled((p + 1) * perPage >= cards.length),
      new ButtonBuilder()
        .setCustomId('end')
        .setLabel('Finish')
        .setStyle(ButtonStyle.Danger)
    )

  await interaction.editReply({
    embeds: [makeEmbed(page)],
    components: [getRow(page)],
    ephemeral: true,
  })

  const collector = interaction.channel.createMessageComponentCollector({
    time: 60000,
  })

  collector.on('collect', async (btn) => {
    if (btn.user.id !== interaction.user.id)
      return btn.reply({ content: 'Not your navigation.', ephemeral: true })

    if (btn.customId === 'end') return collector.stop()

    page += btn.customId === 'next' ? 1 : -1
    await btn.update({
      embeds: [makeEmbed(page)],
      components: [getRow(page)],
    })
  })

  collector.on('end', async () => {
    await interaction.editReply({
      embeds: [makeEmbed(page).setFooter({ text: 'Session ended.' })],
      components: [],
      ephemeral: true,
    })
  })
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
