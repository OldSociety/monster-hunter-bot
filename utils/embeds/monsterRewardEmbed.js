// embeds/monsterRewardEmbed.js
const { EmbedBuilder } = require('discord.js')

/**
 * Generates an embed for a monster reward.
 * @param {Object} monster - The monster object with properties: name, type, color, imageUrl.
 * @param {String} rarityStars - Star rating based on rarity.
 * @returns {EmbedBuilder} - Configured embed for the monster reward.
 */
function generateMonsterRewardEmbed(monster, category, rarityStars) {
  return new EmbedBuilder()
    .setColor(monster.color)
    .setTitle(monster.name)
    .setDescription(`**Type:** ${monster.type} (${category})`)
    .addFields({name: `**Challenge**`, value: `${monster.cr}`},
    )
    .setThumbnail(monster.imageUrl)
    .setFooter({ text: `Rarity: ${rarityStars}` })
}

module.exports = { generateMonsterRewardEmbed }
