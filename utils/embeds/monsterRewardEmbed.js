// embeds/monsterRewardEmbed.js
const { EmbedBuilder } = require('discord.js')

/**
 * Generates an embed for a monster reward.
 * @param {Object} monster - The monster object with properties: name, type, color, imageUrl.
 * @param {String} rarityStars - Star rating based on rarity.
 * @returns {EmbedBuilder} - Configured embed for the monster reward.
 */
function generateMonsterRewardEmbed(monster, category, rarityStars) {
  const categoryThumbnailMap = {
    brute:
      'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/bruteA.png',
    spellsword:
      'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/spellswordC.png',
    stealth:
      'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/stealthC.png',
  }

  const thumbnailUrl = categoryThumbnailMap[category] || monster.imageUrl

  return new EmbedBuilder()
    .setColor(monster.color)
    .setTitle(monster.name)
    .setDescription(`**Type:** ${monster.type} (${category})`)
    .addFields({ name: `**Challenge**`, value: `${monster.cr}` })
    .setImage(monster.imageUrl)
    .setThumbnail(thumbnailUrl)
    .setFooter({ text: `Rarity: ${rarityStars}` })
}

module.exports = { generateMonsterRewardEmbed }
