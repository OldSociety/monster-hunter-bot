const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { checkUserAccount } = require('../Account/checkAccount.js')
const { collectors, stopUserCollector } = require('../../utils/collectors')
const fs = require('fs')
const path = require('path')
let cacheMonstersByTier
;(async () => {
  const module = await import('../../handlers/pullHandler.js')
  cacheMonstersByTier = module.cacheMonstersByTier
})()

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
    const userId = interaction.user.id

    stopUserCollector(userId)

    const user = await checkUserAccount(interaction)
    if (!user) return

    const fetch = (await import('node-fetch')).default
    const subcommand = interaction.options.getSubcommand()

    await cacheMonsterList()
    await processMonsterDetails()

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
      collectors.set(userId, collector)

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
      // Existing code for 'filter' subcommand

      const monsterType = interaction.options
        .getString('monstertype')
        ?.toLowerCase()
      const crFilter = interaction.options.getString('cr')
      const monstersPerPage = 10 // Reduce number of results per page to avoid issues

      let monstersToDisplay = monsterListCache
        .filter((monster) => validCreatures.has(monster.index))
        .map((monster) => ({
          name: monster.name,
          cr: monster.challenge_rating,
          type: monster.type,
        }))

      if (monsterType) {
        if (monsterType === 'all') {
          const typeCounts = {}
          monstersToDisplay.forEach((monster) => {
            const type = monster.type || 'unknown'
            typeCounts[type] = (typeCounts[type] || 0) + 1
          })

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
      }

      if (crFilter?.toLowerCase() === 'all') {
        const crCounts = {}
        monstersToDisplay.forEach((monster) => {
          crCounts[monster.cr] = (crCounts[monster.cr] || 0) + 1
        })

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
              .setDisabled((page + 1) * monstersPerPage >= crEntries.length),
            new ButtonBuilder()
              .setCustomId('finish')
              .setLabel('Finish')
              .setStyle(ButtonStyle.Danger)
          )
        }

        await interaction.editReply({
          embeds: [createCRCountEmbed(currentPage)],
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
            embeds: [createCRCountEmbed(currentPage)],
            components: [getRow(currentPage)],
          })
        })

        collector.on('end', async () => {
          await interaction.editReply({
            embeds: [
              createCRCountEmbed(currentPage).setFooter({
                text: 'Session ended.',
              }),
            ],
            components: [],
          })
        })

        return
      } else if (crFilter) {
        const parsedCR = parseFloat(crFilter)
        if (!isNaN(parsedCR)) {
          monstersToDisplay = monstersToDisplay.filter(
            (monster) => monster.cr === parsedCR
          )
        }
      }

      if (monstersToDisplay.length === 0) {
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
          let valueText = ''
          if (monsterType) {
            valueText = `CR: ${monster.cr}`
          } else if (crFilter) {
            valueText = `Type: ${monster.type}`
          } else {
            valueText = `Type: ${monster.type} | CR: ${monster.cr}`
          }
          embed.addFields({
            name: `${monster.name}`,
            value: valueText,
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
