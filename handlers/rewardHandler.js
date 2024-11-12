async function addGoldToUser(user, amount) {
  user.gold += amount
  await user.save()
}

module.exports = { calculateReward, addGoldToUser }
