// dailyRewardsHandler.js
const { Collection } = require('../../../Models/model.js')
const { pullValidMonster } = require('../../handlers/pullHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../handlers/monsterHandler')
const { updateTop5AndUserScore } = require('../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../utils/starRating')

async function grantDailyReward(user) {
  const currentDay = user.daily_streak % 7 || 7 // Ensure it cycles between 1 and 7
  let rewardMessage = { content: '' } // Initialize rewardMessage

  switch (currentDay) {
    case 1:
      user.gold += 800
      rewardMessage.content = 'You received 🪙800 gold!'
      break

    case 2: {
      const commonMonster = await pullValidMonster({ name: 'Common' })
      if (commonMonster) {
        await updateOrAddMonsterToCollection(user.user_id, commonMonster)
        await updateTop5AndUserScore(user.user_id)
        const stars = getStarsBasedOnColor(commonMonster.color)
        const monsterEmbed = generateMonsterRewardEmbed(commonMonster, stars)
        rewardMessage = {
          content: 'You received a common monster!',
          embeds: [monsterEmbed],
        }
      }
      break
    }

    case 3:
      user.currency.gems += 10
      rewardMessage.content = 'You received 💎10 gems!'
      break

    case 4:
      user.gold += 1000
      rewardMessage.content = 'You received 🪙1000 gold!'
      break

    case 5: {
      const uncommonMonster = await pullValidMonster({ name: 'Uncommon' }) 
      if (uncommonMonster) {
        await updateOrAddMonsterToCollection(user.user_id, uncommonMonster)
        await updateTop5AndUserScore(user.user_id)
        const stars = getStarsBasedOnColor(uncommonMonster.color)
        const monsterEmbed = generateMonsterRewardEmbed(uncommonMonster, stars)
        rewardMessage = {
          content: 'You received an uncommon monster!',
          embeds: [monsterEmbed],
        }
      }
      break
    }

    case 6:
      user.gold += 2000
      rewardMessage.content = 'You received 🪙2000 gold!'
      break

    case 7:
      user.currency.gems += 20
      rewardMessage.content = 'You received 💎20 gems!'
      break
  }

  // Increment and save user's progress
  user.daily_streak = (user.daily_streak % 7) + 1 // Update daily streak with wraparound
  user.last_daily_claim = new Date()
  await user.save()

  return rewardMessage
}

module.exports = { grantDailyReward }
