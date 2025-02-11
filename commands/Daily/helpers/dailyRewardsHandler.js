const { Monster } = require('../../../Models/model.js')
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/userMonsterHandler')
const { updateTop5AndUserScore } = require('../../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../../utils/starRating')
const { classifyMonsterType } = require('../../Hunt/huntUtils/huntHelpers')
const { EmbedBuilder } = require('discord.js')

const rotatingMonsters = [
  'lemure',
  'nightmare',
  'barbed devil',
  'bone devil',
  'horned devil',
  'erinyes',
  'rakshasa',
  'marilith',
  'pit fiend',
] // 8 demon cards

async function grantDailyReward(user, interaction) {
  const currentDay = (user.daily_streak + 1) % 80 || 80 // 🛑 Full 80-day cycle before resetting

  if (currentDay % 10 === 0) {
    // Every 10th day, grant a demon card
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffcc00)
          .setDescription('Loading demon reward, please wait...'),
      ],
    })

    // 🛑 Cycle through the 8 demon cards based on `daily_streak / 10`
    const monsterIndex = Math.floor((user.daily_streak % 80) / 10) % rotatingMonsters.length
    const monsterName = rotatingMonsters[monsterIndex]

    // Fetch monster from database
    const monster = await Monster.findOne({ where: { index: monsterName } })

    if (monster) {
      await updateOrAddMonsterToCollection(user.user_id, monster)
      await updateTop5AndUserScore(user.user_id)

      const stars = getStarsBasedOnColor(monster.color)
      const category = classifyMonsterType(monster.type)
      const monsterEmbed = generateMonsterRewardEmbed(monster, category, stars)

      return { embeds: [monsterEmbed] }
    } else {
      return {
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Daily Reward Failed')
            .setDescription(
              'An error occurred while retrieving your demon card. Please try again later.'
            ),
        ],
      }
    }
  } else {
    // 🛑 Normal daily rewards for non-10th day streaks
    const rewards = [
      { type: 'gold', amount: 200, text: '🪙200 coins' },
      { type: 'eggs', amount: 2, text: '🥚2 dragon eggs' },
      { type: 'ichor', amount: 3, text: '🧪3 demon ichor' },
      { type: 'gold', amount: 600, text: '🪙600 coins' },
      { type: 'eggs', amount: 3, text: '🥚3 dragon eggs' },
      { type: 'ichor', amount: 3, text: '🧪3 demon ichor' },
      { type: 'gold', amount: 1000, text: '🪙1000 coins' },
      { type: 'eggs', amount: 3, text: '🥚3 dragon eggs' },
      { type: 'ichor', amount: 3, text: '🧪3 demon ichor' },
    ]

    const reward = rewards[(currentDay - 1) % rewards.length] || {
      type: 'gold',
      amount: 200,
      text: '🪙200 coins',
    }

    // Apply the reward correctly
    if (reward.type === 'gold') {
      user.gold += reward.amount
    } else if (reward.type === 'eggs') {
      user.currency = {
        ...user.currency,
        eggs: (user.currency.eggs || 0) + reward.amount,
      }
    } else if (reward.type === 'ichor') {
      user.currency = {
        ...user.currency,
        ichor: (user.currency.ichor || 0) + reward.amount,
      }
    }

    await user.save()

    return {
      embeds: [
        new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Daily Reward Received')
          .setDescription(
            `You received ${reward.text}! Return tomorrow for your next reward.`
          ),
      ],
    }
  }
}

module.exports = { grantDailyReward }
