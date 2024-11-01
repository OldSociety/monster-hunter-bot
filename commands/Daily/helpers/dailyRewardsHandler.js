const {
  fetchMonsterByName,
  pullValidMonster,
} = require('../../../handlers/pullHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/monsterHandler')
const { updateTop5AndUserScore } = require('../../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../../utils/starRating')

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

async function grantDailyReward(user, interaction) {
  const currentDay = user.daily_streak + (1 % 10) || 10 // Ensure it cycles between 1 and 10
  let rewardMessage = { content: '' }

  console.log(
    `Starting grantDailyReward for user ${user.user_id} at streak day ${currentDay}.`
  )

  switch (currentDay) {
    case 1:
      user.gold += 200
      rewardMessage.content = 'You received 🪙200 gold!'
      await user.save()
      console.log(
        `Added 200 gold to user ${user.user_id}. New gold: ${user.gold}`
      )
      break

    case 2:
      user.currency = {
        ...user.currency, 
        gems: user.currency.gems + 3, 
      }
      rewardMessage.content = 'You received 💎3 gems!'
      await user.save({ fields: ['currency'] })
      console.log(
        `Added 3 gems to user ${user.user_id}. New gems: ${user.currency.gems}`
      )
      break

    case 3:
      user.currency = {
        ...user.currency,
        ichor: user.currency.ichor + 2,
      }
      rewardMessage.content = 'You received 🧪2 demon ichor!'
      await user.save({ fields: ['currency'] })
      console.log(
        `Added 2 ichor to user ${user.user_id}. New ichor: ${user.currency.ichor}`
      )
      break

    case 4:
      user.gold += 600
      rewardMessage.content = 'You received 🪙600 gold!'
      await user.save()
      console.log(
        `Added 600 gold to user ${user.user_id}. New gold: ${user.gold}`
      )
      break

    case 5:
      user.currency = {
        ...user.currency,
        gems: user.currency.gems + 3,
      }
      rewardMessage.content = 'You received 💎3 gems!'
      await user.save({ fields: ['currency'] })
      console.log(
        `Added 3 gems to user ${user.user_id}. New gems: ${user.currency.gems}`
      )
      break

    case 6:
      user.currency = {
        ...user.currency, 
        ichor: user.currency.ichor + 3,
      }
      rewardMessage.content = 'You received 🧪3 demon ichor!'
      await user.save({ fields: ['currency'] })
      console.log(
        `Added 3 ichor to user ${user.user_id}. New ichor: ${user.currency.ichor}`
      )
      break

    case 7:
      user.gold += 1000
      rewardMessage.content = 'You received 🪙1000 gold!'
      await user.save()
      console.log(
        `Added 1000 gold to user ${user.user_id}. New gold: ${user.gold}`
      )
      break

    case 8:
      user.currency = {
        ...user.currency,
        gems: user.currency.gems + 3,
      }
      rewardMessage.content = 'You received 💎3 gems!'
      await user.save({ fields: ['currency'] })
      console.log(
        `Added 3 gems to user ${user.user_id}. New gems: ${user.currency.gems}`
      )
      break

    case 9:
      user.currency = {
        ...user.currency, 
        ichor: user.currency.ichor + 3,
      }
      rewardMessage.content = 'You received 🧪3 demon ichor!'
      await user.save({ fields: ['currency'] })
      console.log(
        `Added 3 ichor to user ${user.user_id}. New ichor: ${user.currency.ichor}`
      )
      break

    case 10: {
      // const monsterIndex =
      //   Math.floor((user.daily_streak - 1) / 10) % rotatingMonsters.length
      const monsterName = 'Chasme'
      console.log(
        `Attempting to add rotating monster '${monsterName}' for user ${user.user_id}.`
      )

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
        console.log(
          `Monster '${monster.name}' awarded to user ${user.user_id}.`
        )
      } else {
        rewardMessage.content = `The monster ${monsterName} could not be found.`
        console.error(
          `Error: Monster ${monsterName} could not be found for user ${user.user_id}.`
        )
      }
      break
    }
  }

  // Increment and save user’s progress
  user.daily_streak = (user.daily_streak % 80) + 1 // Cycles back to 1 after 80 days
  await user.save()
  console.log(
    `User ${user.user_id} daily streak incremented to ${user.daily_streak}.`
  )

  return rewardMessage
}

module.exports = { grantDailyReward }
