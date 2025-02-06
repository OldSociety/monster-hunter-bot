const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { checkUserAccount } = require('../Account/checkAccount.js')
const fs = require('fs')
const path = require('path')

async function loadMonsterCache() {
  const module = await import('../../handlers/cacheHandler.js')

  console.log('[CACHE] cacheHandler module contents:', module)

  if (!module.populateMonsterCache) {
    console.error('[CACHE ERROR] populateMonsterCache function missing!')
    return
  }

  console.log('[CACHE] Running populateMonsterCache...')
  await module.populateMonsterCache()

  // ✅ Make sure global.monsterCacheByTier is correctly set
  if (!global.monsterCacheByTier || global.monsterCacheByTier.length === 0) {
    console.error(
      '[CACHE ERROR] global.monsterCacheByTier is undefined or empty!'
    )
  } else {
    console.log('[CACHE] Successfully loaded monsterCacheByTier.')
  }
}

const assetsPath = path.join(__dirname, '..', '..', 'assets')
const creatureFiles = fs.readdirSync(assetsPath)
const validCreatures = new Set(
  creatureFiles.map((filename) => path.parse(filename).name)
)

let monsterListCache = []

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
    await loadMonsterCache()

    if (
      !global.monsterCacheByTier ||
      Object.keys(global.monsterCacheByTier).length === 0
    ) {
      return interaction.editReply({
        content: 'Monster cache failed to load. Please try again later.',
        ephemeral: true,
      })
    }

    console.log(
      '[CACHE] Monster cache loaded successfully. Running /list command...'
    )

    const user = await checkUserAccount(interaction)
    if (!user) return

    const fetch = (await import('node-fetch')).default
    const subcommand = interaction.options.getSubcommand()

    if (subcommand === 'missing') {
      return await listMissingMonsters(interaction) //
    } else if (subcommand === 'filter') {
      return await listFilteredMonsters(interaction)
    }
  },
}

async function listMissingMonsters(interaction) {
  if (!global.monsterCacheByTier) {
    console.error('[CACHE ERROR] global.monsterCacheByTier is undefined!')
    return interaction.editReply({
      content: 'Error: Monster cache is missing.',
    })
  }

  // ✅ Correctly get all cached monsters
  const cachedMonsterIndexes = new Set(
    Object.values(global.monsterCacheByTier)
      .flat()
      .map((monster) => monster.index)
  )

  // ✅ Filter missing monsters by checking the assets folder
  let missingMonsters = []
  for (const index of cachedMonsterIndexes) {
    if (!validCreatures.has(index)) {
      missingMonsters.push({
        name: index.replace(/-/g, ' '), // Format name from index
        index,
      })
    }
  }

  if (missingMonsters.length === 0) {
    return interaction.editReply({ content: 'No missing monsters found.' })
  }

  return paginateResults(interaction, missingMonsters, 'Missing Monsters')
}

async function listFilteredMonsters(interaction) {
  const monsterType = interaction.options
    .getString('monstertype')
    ?.toLowerCase()
  const crFilter = interaction.options.getString('cr')
  const monstersPerPage = 10
  let filteredMonsters = Object.values(global.monsterCacheByTier).flat() // ✅ Flatten tiers

  console.log(`[FILTER] Starting with ${filteredMonsters.length} monsters.`)

  if (monsterType) {
    filteredMonsters = filteredMonsters.filter(
      (monster) => monster.type?.toLowerCase() === monsterType
    )
  }

  if (crFilter) {
    const parsedCR = parseFloat(crFilter)
    if (!isNaN(parsedCR)) {
      filteredMonsters = filteredMonsters.filter(
        (monster) => monster.cr === parsedCR
      )
    }
  }

  if (filteredMonsters.length === 0) {
    return interaction.editReply({
      content: 'No monsters found with the specified filters.',
    })
  }

  let currentPage = 0

  const createEmbed = (page) => {
    const paginatedMonsters = filteredMonsters.slice(
      page * monstersPerPage,
      (page + 1) * monstersPerPage
    )

    const embedTitle = `Filtered Monsters (${filteredMonsters.length})`
    const embed = new EmbedBuilder()
      .setTitle(embedTitle)
      .setColor(0x00bfff)
      .setFooter({
        text: `Page ${page + 1} of ${Math.ceil(
          filteredMonsters.length / monstersPerPage
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
        .setDisabled((page + 1) * monstersPerPage >= filteredMonsters.length),
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
