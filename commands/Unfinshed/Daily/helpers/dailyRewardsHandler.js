const { fetchCardByRarity } = require('./cardHelpers.js')
const { User, UserCardCollection } = require('../../../Models/model.js')

async function grantDailyReward(user) {
  const currentDay = user.daily_streak % 7 || 7 // Ensure it cycles between 1 and 7

  switch (currentDay) {
    case 1:
      user.balance += 5000
      break
    case 2:
      const exRareCard = await fetchCardByRarity(['exRare'])
      await UserCardCollection.create({
        user_id: user.user_id,
        card_id: exRareCard.id, // This should now have a valid value
        quantity: 1,
      })
      break
    case 3:
      user.qubit_balance += 30
      break
    case 4:
      user.balance += 10000
      break
    case 5:
      const exEpicCard = await fetchCardByRarity(['exEpic'])
      await UserCardCollection.create({
        user_id: user.user_id,
        card_id: exEpicCard.id,
        quantity: 1,
      })
      break
    case 6:
      user.balance += 15000
      break
    case 7:
      user.qubit_balance += 60
      break
  }

  // Increment and save user's progress
  user.daily_streak = user.daily_streak % 7 + 1; //Update daily streak with wraparound
  await user.save()
}

module.exports = { grantDailyReward }
