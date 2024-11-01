const {
  fetchMonsterByName,
  pullValidMonster,
} = require('../../handlers/pullHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../handlers/monsterHandler')
const { updateTop5AndUserScore } = require('../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../utils/starRating')

const rotatingMonsters = [
  'lemure',
  'nightmare',
  'shadow-demon',
  'barbed-devil',
  'chasme',
  'chain-devil',
  'vrock',
  'bone-devil',
]

async function grantDailyReward(user) {
  const currentDay = user.daily_streak % 10 || 10 // Ensure it cycles between 1 and 10
  let rewardMessage = { content: '' }

  switch (currentDay) {
    case 1:
      user.gold += 200
      rewardMessage.content = 'You received 🪙200 gold!'
      break

    case 2:
      user.currency.gems += 3
      rewardMessage.content = 'You received 💎3 gems!'
      break

    case 3:
      user.currency.ichor += 2
      rewardMessage.content = 'You received 🧪2 ichor!'
      break

    case 4:
      user.gold += 600
      rewardMessage.content = 'You received 🪙600 gold!'
      break

    case 5:
      user.currency.gems += 3
      rewardMessage.content = 'You received 💎3 gems!'
      break

    case 6:
      user.currency.ichor += 3
      rewardMessage.content = 'You received 🧪3 ichor!'
      break

    case 7:
      user.gold += 1000
      rewardMessage.content = 'You received 🪙1000 gold!'
      break

    case 8:
      user.currency.gems += 3
      rewardMessage.content = 'You received 💎3 gems!'
      break

    case 9:
      user.currency.ichor += 3
      rewardMessage.content = 'You received 🧪3 ichor!'
      break

    case 10: {
      // Calculate the monster index based on the user's streak, rotating through monsters every 10 days
      const monsterIndex = Math.floor((user.daily_streak - 1) / 10) % rotatingMonsters.length
      const monsterName = rotatingMonsters[monsterIndex]

      const monster = await fetchMonsterByName(monsterName)
      if (monster) {
        await updateOrAddMonsterToCollection(user.user_id, monster)
        await updateTop5AndUserScore(user.user_id)
        const stars = getStarsBasedOnColor(monster.color)
        const monsterEmbed = generateMonsterRewardEmbed(monster, stars)

        rewardMessage = {
          content: `You received a ${monster.name}!`,
          embeds: [monsterEmbed],
        }
      } else {
        rewardMessage.content = `The monster ${monsterName} could not be found.`
      }
      break
    }
  }

  // Increment and save user's progress
  user.daily_streak = (user.daily_streak % 80) + 1 // Cycles back to 1 after 80 days
  user.last_daily_claim = new Date()
  await user.save()

  return rewardMessage
}

module.exports = { grantDailyReward }
