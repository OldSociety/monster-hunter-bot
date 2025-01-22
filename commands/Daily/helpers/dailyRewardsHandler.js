const {
  fetchMonsterByName,
  cacheMonstersByTier,
} = require('../../../handlers/pullHandler')
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
]

let cachePopulated = false

async function grantDailyReward(user, interaction) {
  const currentDay = (user.daily_streak + 1) % 10 || 10

  if (currentDay === 10) {
    if (!cachePopulated) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffcc00)
            .setDescription('Loading daily reward, please wait...'),
        ],
      })

      await cacheMonstersByTier()
      cachePopulated = true
    }

    const monsterIndex =
      Math.floor(user.daily_streak / 10) % rotatingMonsters.length
    const monsterName = rotatingMonsters[monsterIndex]

    const monster = await fetchMonsterByName(monsterName)
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
              'An error occurred while retrieving your monster. Please try again later.'
            ),
        ],
      }
    }
  } else {
    const rewards = [
      { type: 'gold', amount: 200, text: '🪙200 coins' },
      { type: 'eggs', amount: 1, text: '🥚1 dragon egg' },
      { type: 'ichor', amount: 2, text: '🧪2 demon ichor' },
      { type: 'gold', amount: 600, text: '🪙600 coins' },
      { type: 'eggs', amount: 1, text: '🥚1 dragon egg' },
      { type: 'ichor', amount: 3, text: '🧪3 demon ichor' },
      { type: 'gold', amount: 1000, text: '🪙1000 coins' },
      { type: 'eggs', amount: 1, text: '🥚1 dragon egg' },
      { type: 'ichor', amount: 3, text: '🧪3 demon ichor' },
    ]

    const reward = rewards[currentDay - 1] || {
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
        eggs: user.currency.eggs + reward.amount,
      }
    } else if (reward.type === 'ichor') {
      user.currency = {
        ...user.currency,
        ichor: user.currency.ichor + reward.amount,
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
