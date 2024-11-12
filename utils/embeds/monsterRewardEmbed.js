// embeds/monsterRewardEmbed.js
const { EmbedBuilder } = require('discord.js')

/**
 * Generates an embed for a monster reward.
 * @param {Object} monster - The monster object with properties: name, type, color, imageUrl.
 * @param {String} rarityStars - Star rating based on rarity.
 * @returns {EmbedBuilder} - Configured embed for the monster reward.
 */
function generateMonsterRewardEmbed(monster, category, rarityStars) {
  // Map category to corresponding thumbnail image URL
  const categoryThumbnailMap = {
    brute: 'https://wiki.uestrpg.com/images/a/ad/Symbol-Warrior.png',
    spellsword: 'https://wiki.uestrpg.com/images/7/71/Symbol-Spellsword.png',
    stealth: 'https://wiki.uestrpg.com/images/8/8c/Symbol-Nightblade.png'
  };

  // Determine the thumbnail based on category, fallback to monster image if category not recognized
  const thumbnailUrl = categoryThumbnailMap[category] || monster.imageUrl;

  return new EmbedBuilder()
    .setColor(monster.color)
    .setTitle(monster.name)
    .setDescription(`**Type:** ${monster.type} (${category})`)
    .addFields({ name: `**Challenge**`, value: `${monster.cr}` })
    .setImage(monster.imageUrl) // Keeping the main image unchanged
    .setThumbnail(thumbnailUrl) // Set the determined thumbnail
    .setFooter({ text: `Rarity: ${rarityStars}` });
}


module.exports = { generateMonsterRewardEmbed }
