const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const {
  cacheMonstersByTier,
  selectTier,
  pullValidMonster,
} = require('../../handlers/monsterHandler')

// Define excluded types for the pull command
const excludedTypes = new Set(['fey','dragon', 'fiend']) // Add any types you wish to exclude

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pull')
    .setDescription('Pulls a random monster card with tier-based rarity'),

  async execute(interaction) {
    await interaction.deferReply()

    await cacheMonstersByTier()

    let monster
    let retries = 0
    const maxRetries = 5

    do {
      const selectedTier = selectTier()
      monster = await pullValidMonster(selectedTier)

      // Check if the monster's type is in the exclusion list
      if (monster && excludedTypes.has(monster.type.toLowerCase())) {
        console.log(`Excluded monster type: ${monster.type}`)
        monster = null // Skip the monster if it matches the excluded type
      }
      retries++
    } while (!monster && retries < maxRetries)

    if (monster) {
      const embed = new EmbedBuilder()
        .setColor(monster.color)
        .setTitle(monster.name)
        .setDescription(`**Type:** ${monster.type}`)
        .setThumbnail(monster.imageUrl)
        .setFooter({ text: `Challenge Rating: ${monster.cr}` })

      await interaction.editReply({ embeds: [embed] })
    } else {
      await interaction.editReply(
        'Could not retrieve a valid monster. Please try again later.'
      )
    }
  },
}
