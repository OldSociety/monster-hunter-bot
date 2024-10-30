const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const {
  cacheMonstersByTier,
  selectTier,
  pullValidMonster,
} = require('../../handlers/pullHandler')
const { updateOrAddMonsterToCollection } = require('../../handlers/monsterHandler')
const { updateTop5AndUserScore } = require('../../handlers/topCardsManager')
const { User } = require('../../Models/model') 

// EXCLUDED TYPES
const excludedTypes = new Set(['fey', 'dragon', 'fiend']) 

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
        monster = null
      }
      retries++
    } while (!monster && retries < maxRetries)

    if (monster) {
      // Check if this monster is already in the user's collection
      await updateOrAddMonsterToCollection(userId, monster);
      await updateTop5AndUserScore(userId)


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
