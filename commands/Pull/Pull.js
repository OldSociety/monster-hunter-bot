// pull.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const {
  cacheMonstersByTier,
  selectTier,
  pullValidMonster,
} = require('../../handlers/monsterHandler')

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
      retries++
    } while (!monster && retries < maxRetries)

    if (monster) {
      const embed = new EmbedBuilder()
        .setColor(monster.color)
        .setTitle(monster.name)
        .setDescription(`**Type:** ${monster.type}`)
        .setThumbnail(monster.imageUrl)

      await interaction.editReply({ embeds: [embed] })
    } else {
      await interaction.editReply(
        'Could not retrieve a valid monster. Please try again later.'
      )
    }
  },
}
