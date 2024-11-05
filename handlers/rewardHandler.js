const { User } = require('../Models/model')

function calculateReward(cr) {
  return 24 + cr // Gold reward calculation
}

async function addGoldToUser(user, amount) {
  user.gold += amount
  await user.save()
}

module.exports = { calculateReward, addGoldToUser }
