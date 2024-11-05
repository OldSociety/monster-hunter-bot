const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { cacheMonstersByTier } = require('../../handlers/pullHandler')

let monsterListCache = [] // Cache for monster data

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('(ADMIN) Lists monsters by CR tier, name, or type')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('crtiers')
        .setDescription('Lists the number of monsters by CR tier')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('findname')
        .setDescription('Searches for a specific monster by name')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Monster name to search')
            .setRequired(true)
        )
    )
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
    const subcommand = interaction.options.getSubcommand(false) || 'crtiers'
    const monsterType = interaction.options.getString('monstertype')?.toLowerCase()

    async function cacheMonsterList() {
      if (monsterListCache.length === 0) {
        const response = await fetch('https://www.dnd5eapi.co/api/monsters')
        const data = await response.json()
        monsterListCache = data.results
        console.log('Fetched monster list:', monsterListCache)
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

    if (subcommand === 'type') {
      const typeCounts = monsterListCache.reduce((acc, monster) => {
        if (monster.type) {
          acc[monster.type] = (acc[monster.type] || 0) + 1
        }
        return acc
      }, {})

      const typeEmbed = new EmbedBuilder().setColor(0x00bfff).setFooter({ text: 'Data retrieved from D&D API' })

      if (!monsterType) {
        // Show counts for each type
        typeEmbed.setTitle('Monsters by Type').setDescription('Count of monsters organized by type.')
        Object.entries(typeCounts).forEach(([type, count]) => {
          typeEmbed.addFields({
            name: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
            value: `${count} monsters`,
            inline: true,
          })
        })
      } else {
        // Show monsters in the specified type
        const monstersInType = monsterListCache
          .filter((monster) => monster.type?.toLowerCase() === monsterType)
          .map((monster) => ({ name: monster.name, cr: monster.challenge_rating }))

        if (monstersInType.length > 0) {
          typeEmbed.setTitle(`Monsters of Type: ${monsterType.charAt(0).toUpperCase() + monsterType.slice(1)}`)
          monstersInType.forEach((monster) => {
            typeEmbed.addFields({
              name: `${monster.name}`,
              value: `CR: ${monster.cr}`,
              inline: true,
            })
          })
        } else {
          typeEmbed.setTitle(`No monsters found of type "${monsterType}"`)
        }
      }

      await interaction.editReply({ embeds: [typeEmbed] })
    }
  },
}
