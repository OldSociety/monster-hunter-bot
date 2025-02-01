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
let cacheMonstersByTier

async function loadMonsterCache() {
  const module = await import('../../handlers/pullHandler.js')

  // Check if cache exists inside the module
  console.log('[CACHE] pullHandler module contents:', module)

  // Run the cache function if needed
  if (
    !module.cachePopulated ||
    Object.keys(module.monsterCacheByTier).length === 0
  ) {
    console.log('[CACHE] Running cacheMonstersByTier...')
    await module.cacheMonstersByTier() // Ensure it executes
  }

  cacheMonstersByTier = module.monsterCacheByTier

  // console.log("[CACHE] cacheMonstersByTier type:", typeof cacheMonstersByTier);
  // console.log("[CACHE] First 3 monsters in cache:", Object.values(cacheMonstersByTier).flat().slice(0, 3));

  if (!cacheMonstersByTier || Object.keys(cacheMonstersByTier).length === 0) {
    console.warn('[CACHE ERROR] cacheMonstersByTier is empty or undefined!')
  }
}

module.exports = {
  async execute(interaction) {
    await loadMonsterCache() // Ensure it loads before running commands
  },
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
            .setDescription(
              'Specify a monster type to list all monsters within it'
            )
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('cr')
            .setDescription(
              'Specify a challenge rating or "all" to list all CRs'
            )
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
            .setDescription('HP range (e.g., ±10 for 10 above and below)')
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
    console.log(loadMonsterCache)
    const userId = interaction.user.id

    const user = await checkUserAccount(interaction)
    if (!user) return

    const fetch = (await import('node-fetch')).default
    const subcommand = interaction.options.getSubcommand()

    await cacheMonsterList()
    await processMonsterDetails()

    const minCR = interaction.options.getInteger('min_cr') || 0
    const maxCR = interaction.options.getInteger('max_cr') || 30
    const hp = interaction.options.getInteger('hp') ?? null
    const hpRange = interaction.options.getInteger('hp_range') ?? 0

    // Ensure cacheMonstersByTier is available before filtering
    if (!cacheMonstersByTier || Object.keys(cacheMonstersByTier).length === 0) {
      console.warn('[CACHE ERROR] cacheMonstersByTier is empty or undefined!')
    } else {
      const firstMonster = Object.values(cacheMonstersByTier).flat()[0]

      if (firstMonster) {
        console.log(
          '[CACHE] First Monster Loaded:',
          JSON.stringify(firstMonster, null, 2)
        )
      } else {
        console.warn('[CACHE] No monsters found in cache.')
      }
    }
    console.log('[CACHE] Debugging monster cache...')
    console.log('🔹 Checking first 3 monsters from cache:')
    Object.values(cacheMonstersByTier)
      .flat()
      .slice(0, 3)
      .forEach((monster, index) => {
        console.log(
          `  [${index + 1}] Name: ${monster.name}, CR: ${monster.cr}, Type: ${
            monster.type
          }, HP: ${monster.hp}`
        )
      })

    let filteredMonsters = Object.values(cacheMonstersByTier)
      .flat()
      .filter(
        (monster) =>
          monster.challenge_rating >= minCR && monster.challenge_rating <= maxCR
      )
    console.log('CacheMonstersByTier:', cacheMonstersByTier)
    console.log(
      'First Monster in Cache:',
      Object.values(cacheMonstersByTier)?.[0]?.[0]
    )

    if (hp !== null) {
      filteredMonsters = filteredMonsters.filter(
        (monster) =>
          monster.hit_points !== undefined &&
          monster.hit_points >= hp - hpRange &&
          monster.hit_points <= hp + hpRange
      )
    }
    if (subcommand === 'missing') {
      // List monsters not in validCreatures
      let missingMonsters = monsterListCache
        .filter((monster) => !validCreatures.has(monster.index))
        .map((monster) => ({
          name: monster.name,
          cr: monster.challenge_rating,
          type: monster.type,
        }))

      if (missingMonsters.length === 0) {
        return interaction.editReply({
          content: 'No missing monsters found.',
        })
      }

      let currentPage = 0
      const monstersPerPage = 10

      const createEmbed = (page) => {
        const paginatedMonsters = missingMonsters.slice(
          page * monstersPerPage,
          (page + 1) * monstersPerPage
        )
        const embedTitle = `Missing Monsters (${missingMonsters.length})`

        const embed = new EmbedBuilder()
          .setTitle(embedTitle)
          .setColor(0x00bfff)
          .setFooter({
            text: `Page ${page + 1} of ${Math.ceil(
              missingMonsters.length / monstersPerPage
            )}`,
          })

        paginatedMonsters.forEach((monster) => {
          embed.addFields({
            name: `${monster.name}`,
            value: `Type: ${monster.type} | CR: ${monster.cr}`,
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
            .setDisabled(
              (page + 1) * monstersPerPage >= missingMonsters.length
            ),
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
          embeds: [
            createEmbed(currentPage).setFooter({ text: 'Session ended.' }),
          ],
          components: [],
        })
      })

      return
    } else if (subcommand === 'filter') {
      console.log('Executing /list filter subcommand...')
      console.log('[CACHE] First 3 monsters in cache:')
      console.log(Object.values(cacheMonstersByTier).flat().slice(0, 1))

      const monsterType = interaction.options
        .getString('monstertype')
        ?.toLowerCase()
      const crFilter = interaction.options.getString('cr')
      const hp = interaction.options.getInteger('hp') ?? null
      const hpRange = interaction.options.getInteger('hp_range') ?? 0
      const monstersPerPage = 10

      console.log(
        `🔹 Input Values - monsterType: ${monsterType}, cr: ${crFilter}, hp: ${hp}, hpRange: ${hpRange}`
      )

      let monstersToDisplay = Object.values(cacheMonstersByTier)
        .flat()
        .map((monster) => ({
          name: monster.name,
          cr: monster.cr,
          type: monster.type,
          hp: monster.hp, // Pulling from correct cache
        }))

      console.log(`✅ Loaded ${monstersToDisplay.length} monsters from cache`)
      console.log(
        '🔹 First 3 monsters (raw data):',
        monstersToDisplay.slice(0, 3)
      )
      console.log('🔹 Checking first 3 monsters from cache:')
      monstersToDisplay.slice(0, 3).forEach((monster, index) => {
        console.log(
          `  [${index + 1}] Name: ${monster.name}, CR: ${monster.cr}, Type: ${
            monster.type
          }, HP: ${monster.hp}`
        )
      })
      // --- Filter by Monster Type ---
      if (monsterType) {
        if (monsterType === 'all') {
          const typeCounts = {}
          monstersToDisplay.forEach((monster) => {
            const type = monster.type || 'unknown'
            typeCounts[type] = (typeCounts[type] || 0) + 1
          })

          console.log('🔹 Monster Count by Type:', typeCounts)

          const countEmbed = new EmbedBuilder()
            .setTitle('Monster Count by Type')
            .setColor(0x00bfff)

          for (const [type, count] of Object.entries(typeCounts)) {
            countEmbed.addFields({
              name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
              value: `Count: ${count}`,
              inline: true,
            })
          }

          return interaction.editReply({ embeds: [countEmbed] })
        }

        monstersToDisplay = monstersToDisplay.filter(
          (monster) => monster.type?.toLowerCase() === monsterType
        )
        console.log(
          `✅ After type filter (${monsterType}): ${monstersToDisplay.length} monsters`
        )
      }

      // --- Filter by Challenge Rating ---
      if (crFilter?.toLowerCase() === 'all') {
        const crCounts = {}
        monstersToDisplay.forEach((monster) => {
          crCounts[monster.cr] = (crCounts[monster.cr] || 0) + 1
        })

        console.log('🔹 Monster Count by CR:', crCounts)

        const crEntries = Object.entries(crCounts).sort(
          (a, b) => parseFloat(a[0]) - parseFloat(b[0])
        )
        let currentPage = 0

        const createCRCountEmbed = (page) => {
          const paginatedCRs = crEntries.slice(
            page * monstersPerPage,
            (page + 1) * monstersPerPage
          )
          const embed = new EmbedBuilder()
            .setTitle('Monster Count by CR')
            .setColor(0x00bfff)
            .setFooter({
              text: `Page ${page + 1} of ${Math.ceil(
                crEntries.length / monstersPerPage
              )}`,
            })

          paginatedCRs.forEach(([cr, count]) => {
            embed.addFields({
              name: `CR: ${cr}`,
              value: `Count: ${count}`,
              inline: true,
            })
          })

          return embed
        }

        return interaction.editReply({
          embeds: [createCRCountEmbed(0)],
        })
      } else if (crFilter) {
        const parsedCR = parseFloat(crFilter)
        if (!isNaN(parsedCR)) {
          monstersToDisplay = monstersToDisplay.filter(
            (monster) => monster.cr === parsedCR
          )
          console.log(
            `✅ After CR filter (CR ${parsedCR}): ${monstersToDisplay.length} monsters`
          )
        }
      }

      // --- Filter by HP ---
      if (hp !== null) {
        console.log(`🔹 Applying HP filter - Base: ${hp}, Range: ±${hpRange}`)

        let beforeFilterCount = monstersToDisplay.length

        monstersToDisplay = monstersToDisplay.filter(
          (monster) =>
            monster.hp !== undefined &&
            monster.hp >= hp - hpRange &&
            monster.hp <= hp + hpRange
        )

        console.log(
          `✅ HP Filter: Before: ${beforeFilterCount}, After: ${monstersToDisplay.length}`
        )
      }

      if (monstersToDisplay.length === 0) {
        console.log('❌ No monsters found after filtering.')
        return interaction.editReply({
          content: `No monsters found with the specified filters.`,
        })
      }

      let currentPage = 0

      const createEmbed = (page) => {
        const paginatedMonsters = monstersToDisplay.slice(
          page * monstersPerPage,
          (page + 1) * monstersPerPage
        )
        let embedTitle = ''

        if (monsterType) {
          embedTitle = `${
            monsterType.charAt(0).toUpperCase() + monsterType.slice(1)
          } Monsters (${monstersToDisplay.length})`
        } else if (crFilter) {
          embedTitle =
            crFilter.toLowerCase() === 'all'
              ? 'All Monsters by CR'
              : `CR ${crFilter} Monsters (${monstersToDisplay.length})`
        } else if (hp !== null) {
          embedTitle = `Monsters with HP: ${hp} ± ${hpRange} (${monstersToDisplay.length})`
        } else {
          embedTitle = `All Monsters (${monstersToDisplay.length})`
        }

        const embed = new EmbedBuilder()
          .setTitle(embedTitle)
          .setColor(0x00bfff)
          .setFooter({
            text: `Page ${page + 1} of ${Math.ceil(
              monstersToDisplay.length / monstersPerPage
            )}`,
          })

        paginatedMonsters.forEach((monster) => {
          embed.addFields({
            name: `${monster.name}`,
            value: `**CR:** ${monster.cr} | **HP:** ${monster.hp}`,
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
            .setDisabled(
              (page + 1) * monstersPerPage >= monstersToDisplay.length
            ),
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
          embeds: [
            createEmbed(currentPage).setFooter({ text: 'Session ended.' }),
          ],
          components: [],
        })
      })
    }
  },
}

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
      const detailResponse = await fetch(
        `https://www.dnd5eapi.co/api/monsters/${monster.index}`
      )
      const monsterDetails = await detailResponse.json()
      monster.challenge_rating = monsterDetails.challenge_rating ?? 0
      monster.type = monsterDetails.type || 'unknown'
    }
  }
}
