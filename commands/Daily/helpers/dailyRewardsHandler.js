// dailyRewardsHandler.js
const { Collection } = require('../../../Models/model.js')
const { pullValidMonster } = require('../../handlers/pullHandler')

async function grantDailyReward(user) {
  const currentDay = user.daily_streak % 7 || 7 // Ensure it cycles between 1 and 7

  switch (currentDay) {
    case 1:
      user.gold += 800
      break
    case 2:
      const commonMonster = await pullValidMonster({ name: 'Common' }) // Pull common monster
      if (commonMonster) {
        await Collection.create({
          user_id: user.user_id,
          name: commonMonster.name,
          type: commonMonster.type,
          cr: commonMonster.cr,
          rarity: commonMonster.rarity,
          imageUrl: commonMonster.imageUrl,
          quantity: 1,
        })
        console.log(`Granted ${commonMonster.name} (Common) to user ${user.user_id}`)
      }
      break
    case 3:
      user.currency.gems += 10
      break
    case 4:
      user.currency.gold += 1000
      break
    case 5:
      const uncommonMonster = await pullValidMonster({ name: 'Uncommon' }) // Pull uncommon monster
      if (uncommonMonster) {
        await Collection.create({
          user_id: user.user_id,
          name: uncommonMonster.name,
          type: uncommonMonster.type,
          cr: uncommonMonster.cr,
          rarity: uncommonMonster.rarity,
          imageUrl: uncommonMonster.imageUrl,
          quantity: 1,
        })
        console.log(`Granted ${uncommonMonster.name} (Uncommon) to user ${user.user_id}`)
      }
      break
    case 6:
      user.currency.gold += 2000
      break
    case 7:
      user.currency.gems += 20
      break
  }

  // Increment and save user's progress
  user.daily_streak = (user.daily_streak % 7) + 1 // Update daily streak with wraparound
  user.last_daily_claim = new Date()
  await user.save()
}

module.exports = { grantDailyReward }
