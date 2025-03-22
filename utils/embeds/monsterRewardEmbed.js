const { EmbedBuilder } = require('discord.js')

const mScoreMultipliers = {
  Common: {
    1: 1.0,
    2: 1.4,
    3: 1.6,
    4: 1.8,
    5: 2.0,
    6: 2.2,
    7: 2.4,
    8: 2.6,
    9: 2.8,
    10: 3.0,
  },
  Uncommon: {
    1: 1.0,
    2: 1.14,
    3: 1.3,
    4: 1.5,
    5: 1.74,
    6: 2.0,
    7: 2.24,
    8: 2.5,
    9: 3.2,
    10: 4.0,
  },
  Rare: {
    1: 1.0,
    2: 1.25,
    3: 1.4,
    4: 1.6,
    5: 2.0,
    6: 2.16,
    7: 2.4,
    8: 2.8,
    9: 3.5,
    10: 4.25,
  },
  'Very Rare': {
    1: 1.0,
    2: 1.05,
    3: 1.15,
    4: 1.25,
    5: 1.4,
    6: 2.5,
    7: 3.25,
    8: 4.0,
    9: 5.0,
    10: 6.0,
  },
  Legendary: {
    1: 1.05,
    2: 1.15,
    3: 1.25,
    4: 1.4,
    5: 2.5,
    6: 3.25,
    7: 4.0,
    8: 5.0,
    9: 6.0,
    10: 7.0,
  },
}

/**
 * Generates an embed for a monster reward.
 * @param {Object} monster - The monster object with properties such as name, type, color, cr, imageUrl, and rarity.
 * @param {String} category - The category of the monster (e.g., brute, spellsword, stealth).
 * @param {String} rarityStars - Star rating based on rarity.
 * @returns {EmbedBuilder} - Configured embed for the monster reward.
 */
function generateMonsterRewardEmbed(monster, category, rarityStars) {
  const categoryThumbnailMap = {
    brute:
      'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/bruteC.png',
    spellsword:
      'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/spellswordC.png',
    stealth:
      'https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/stealthC.png',
  }

  const thumbnailUrl = categoryThumbnailMap[category] || monster.imageUrl

  // Ensure challenge rating is at least 1.
  const effectiveCR = Math.max(monster.cr, 1)


  // // Use the multiplier at key "2" from the mScoreMultipliers based on the monster's rarity.
  // const multiplier =
  //   monster.rarity && mScoreMultipliers[monster.rarity]
  //     ? mScoreMultipliers[monster.rarity][2]
  //     : 1
  // const monsterScore = multiplier * effectiveCR * 10

  const monsterScore = effectiveCR * 10

  console.log('CR: ', effectiveCR, 'Score', monsterScore)

  return new EmbedBuilder()
    .setColor(monster.color)
    .setTitle(monster.name)
    .setDescription(`**Type:** ${monster.type} (${category})`)
    .addFields({ name: `**Base Score**`, value: `${monsterScore}` })
    .setImage(monster.imageUrl)
    .setThumbnail(thumbnailUrl)
    .setFooter({ text: `Rarity: ${rarityStars}` })
}

module.exports = { generateMonsterRewardEmbed }
