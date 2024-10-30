const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const {
  cacheMonstersByTier,
  selectTier,
  pullValidMonster,
} = require('../../handlers/pullHandler')
const { User, Collection } = require('../../Models/model') // Import the models

// Define excluded types for the pull command
const excludedTypes = new Set(['fey', 'dragon', 'fiend']) // Add any types you wish to exclude

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pull')
    .setDescription('Pulls a random monster card with tier-based rarity'),

  async execute(interaction) {
    await interaction.deferReply()

    const userId = interaction.user.id
    const userName = interaction.user.username

    // Ensure the user exists in the database
    let user = await User.findOne({ where: { user_id: userId } })
    if (!user) {
      user = await User.create({
        user_id: userId,
        user_name: userName,
      })
    }

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
      // Check if this monster is already in the user's collection
      let collectionEntry = await Collection.findOne({
        where: { userId: user.user_id, name: monster.name },
      })

      if (collectionEntry) {
        // Increase the copies if already owned
        await collectionEntry.increment('copies', { by: 1 })
      } else {
        // Add a new monster to the collection if not owned
        await Collection.create({
          userId: user.user_id,
          name: monster.name,
          type: monster.type,
          cr: monster.cr,
          copies: 1, // Initial copy count
          level: 1, // Starting level, could be default
        })
      }

      // Send the embed with monster details
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
