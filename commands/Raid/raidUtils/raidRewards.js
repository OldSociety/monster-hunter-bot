// raidRewards.js

function getUniformBaseRewards(bossDefeated, raidProgressPercentage) {
  const fullBase = {
    gold: 25000,
    legendaryCard: 1,
  }
  if (bossDefeated) {
    return fullBase
  } else {
    let goldReward = 0
    if (raidProgressPercentage >= 0.75) {
      goldReward = Math.round(fullBase.gold * 0.75)
    } else if (raidProgressPercentage >= 0.5) {
      goldReward = Math.round(fullBase.gold * 0.5)
    } else if (raidProgressPercentage >= 0.25) {
      goldReward = Math.round(fullBase.gold * 0.25)
    } else {
      goldReward = 0
    }
    return {
      gold: goldReward,
      legendaryCard: 0,
    }
  }
}

function getUniformGearReward(bossDefeated, raidProgressPercentage) {
  const fullGear = 250
  if (bossDefeated) {
    return fullGear
  } else {
    let gearReward = 0
    if (raidProgressPercentage >= 0.75) {
      gearReward = Math.round(fullGear * 0.75)
    } else if (raidProgressPercentage >= 0.5) {
      gearReward = Math.round(fullGear * 0.5)
    } else if (raidProgressPercentage >= 0.25) {
      gearReward = Math.round(fullGear * 0.25)
    } else {
      gearReward = 0
    }
    return gearReward
  }
}

function shuffleArray(array) {
  let arr = array.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function getUniformCardRewards(bossDefeated, raidProgressPercentage, raidBoss) {
  let lootCards = [raidBoss.loot1, raidBoss.loot2, raidBoss.loot3].filter(
    Boolean
  )
  lootCards = shuffleArray(lootCards)

  if (bossDefeated) {
    return [...lootCards, raidBoss.index]
  } else {
    if (raidProgressPercentage >= 0.75) {
      return lootCards.slice(0, 3)
    } else if (raidProgressPercentage >= 0.5) {
      return lootCards.slice(0, 2)
    } else if (raidProgressPercentage >= 0.25) {
      return lootCards.slice(0, 1)
    } else {
      return []
    }
  }
}

module.exports = {
  getUniformBaseRewards,
  getUniformGearReward,
  getUniformCardRewards,
}
