const {
  fetchMonsterByName,
  cacheMonstersByTier,
} = require('../../../handlers/pullHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/monsterHandler')
const { updateTop5AndUserScore } = require('../../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../../utils/embeds/monsterRewardEmbed')
const { getStarsBasedOnColor } = require('../../../utils/starRating')
const { EmbedBuilder } = require('discord.js')

const rotatingMonsters = [
  'lemure',
  'dretch',
  'hell hound',
  'nightmare',,
  'barbed devil',
  'night hag',
  'vrock',
  'bone devil',
]

let cachePopulated = false

async function grantDailyReward(user, interaction) {
  const currentDay = (user.daily_streak + 1) % 10 || 10 // Ensures cycle between 1 and 10
  let rewardEmbed

  console.log(
    `Starting grantDailyReward for user ${user.user_id} at streak day ${currentDay}.`
  )

  if (currentDay === 10) {
    // Day 10 reward setup: loading embed if cache is not ready
    if (!cachePopulated) {
      console.log('Cache not populated. Showing loading embed.')
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffcc00)
            .setDescription('Loading daily reward, please wait...'),
        ],
        components: [],
      })

      await cacheMonstersByTier()
      cachePopulated = true
      console.log('Cache populated successfully.')
    }

    // Retrieve monster
    const monsterIndex = Math.floor(user.daily_streak / 10) % rotatingMonsters.length
    const monsterName = rotatingMonsters[monsterIndex]
    console.log(
      `Attempting to add rotating monster '${monsterName}' for user ${user.user_id}.`
    )

    const monster = await fetchMonsterByName(monsterName)
    if (monster) {
      await updateOrAddMonsterToCollection(user.user_id, monster)
      await updateTop5AndUserScore(user.user_id)
      const stars = getStarsBasedOnColor(monster.color)
      rewardEmbed = generateMonsterRewardEmbed(monster, stars)
      rewardEmbed.setDescription(`You received ${monster.name}! Return tomorrow for your next reward.`)
      console.log(`Monster '${monster.name}' awarded to user ${user.user_id}.`)
    } else {
      rewardEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setDescription(`The monster ${monsterName} could not be found.`)
      console.error(`Error: Monster ${monsterName} not found for user ${user.user_id}.`)
    }
  } else {
    // Rewards for days 1-9
    let rewardText = ''
    switch (currentDay) {
      case 1:
        user.gold += 200
        rewardText = '🪙200 gold'
        break
      case 2:
        user.currency = { ...user.currency, gems: user.currency.gems + 3 }
        rewardText = '💎3 gems'
        break
      case 3:
        user.currency = { ...user.currency, ichor: user.currency.ichor + 2 }
        rewardText = '🧪2 demon ichor'
        break
      case 4:
        user.gold += 600
        rewardText = '🪙600 gold'
        break
      case 5:
        user.currency = { ...user.currency, gems: user.currency.gems + 3 }
        rewardText = '💎3 gems'
        break
      case 6:
        user.currency = { ...user.currency, ichor: user.currency.ichor + 3 }
        rewardText = '🧪3 demon ichor'
        break
      case 7:
        user.gold += 1000
        rewardText = '🪙1000 gold'
        break
      case 8:
        user.currency = { ...user.currency, gems: user.currency.gems + 3 }
        rewardText = '💎3 gems'
        break
      case 9:
        user.currency = { ...user.currency, ichor: user.currency.ichor + 3 }
        rewardText = '🧪3 demon ichor'
        break
    }
    await user.save({ fields: currentDay === 1 || currentDay === 4 || currentDay === 7 ? [] : ['currency'] })
    console.log(`User ${user.user_id} rewarded on day ${currentDay}.`)

    // Embed for days 1-9
    rewardEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Daily Reward Received')
      .setDescription(`You received ${rewardText}! Return tomorrow for your next reward.`)
  }

  // Increment and save user's progress
  user.daily_streak = (user.daily_streak % 80) + 1
  user.last_daily_claim = new Date()
  await user.save()
  console.log(`User ${user.user_id} daily streak incremented to ${user.daily_streak}.`)

  return { embeds: [rewardEmbed] }
}

module.exports = { grantDailyReward }
