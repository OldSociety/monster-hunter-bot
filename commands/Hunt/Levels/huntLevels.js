// huntLevels.js

const levelData = {
  hunt1: {
    key: 'hunt1',
    name: 'Darkmantle',
    description: 'You hunt begins here...',
    energyCost: 1,
    totalBattles: 3,
    battles: generateHuntOneBattles(),
  },
  hunt2: {
    key: 'hunt2',
    name: 'Harpy',
    description: 'Take down the harpy by avoiding her song.',
    energyCost: 1,
    totalBattles: 5,
    battles: generateHuntTwoBattles(),
  },
  hunt3: {
    key: 'hunt3',
    name: 'Rust',
    description:
      'An army will be left unarmed if the rust monster is not hunted.',
    energyCost: 1,
    totalBattles: 8,
    battles: generateHuntThreeBattles(),
  },
  hunt4: {
    key: 'hunt4',
    name: 'Sea Hag',
    description:
      'Kill the sea hag before more fall under her drowned man curse!',
    energyCost: 1,
    totalBattles: 10,
    battles: generateHuntFourBattles(),
  },
  hunt5: {
    key: 'hunt5',
    name: 'Red Dragon',
    description: 'Dragon',
    energyCost: 1,
    totalBattles: 10,
    battles: generateHuntFiveBattles(),
  },
}

function generateHuntOneBattles() {
  const battles = []

  // Add 3 battles with CR 0
  for (let i = 0; i < 3; i++) {
    battles.push({
      type: 'normal',
      cr: 0,
      difficulty: 'easy', // hp / 2
      goldReward: 24,
    })
  }

  battles.sort(() => Math.random() - 0.5)

  battles.push({
    type: 'mini-boss',
    cr: 0.25,
    monsterIndex: 'darkmantle',
    difficulty: 'boss-half',
    firstGoldReward: 700,
    goldReward: 28,
  })

  return battles
}

function generateHuntTwoBattles() {
  const battles = []

  for (let i = 0; i < 2; i++) {
    battles.push({
      type: 'normal',
      cr: 0.25,
      difficulty: 'easy',
      goldReward: 26,
    })
  }

  for (let i = 0; i < 3; i++) {
    battles.push({
      type: 'normal',
      difficulty: 'easy',
      cr: 0.5,
      goldReward: 28,
    })
  }

  battles.sort(() => Math.random() - 0.5)

  battles.push({
    type: 'mini-boss',
    cr: 2,
    monsterIndex: 'harpy',
    difficulty: 'boss-half',
    firstGoldReward: 650,
    goldReward: 32,
  })

  return battles
}

function generateHuntThreeBattles() {
  const battles = []

  for (let i = 0; i < 4; i++) {
    battles.push({
      type: 'normal',
      difficulty: 'medium',
      cr: 0.25,
      goldReward: 48,
    })
  }

  for (let i = 0; i < 4; i++) {
    battles.push({
      type: 'normal',
      difficulty: 'medium',
      cr: 0.5,
      goldReward: 50,
    })
  }

  battles.sort(() => Math.random() - 0.5)

  battles.push({
    type: 'mini-boss',
    cr: 2,
    monsterIndex: 'rust-monster',
    difficulty: 'boss-full',
    firstGoldReward: 1080,
    goldReward: 52,
  })

  return battles
}

function generateHuntFourBattles() {
  const battles = []

  for (let i = 0; i < 4; i++) {
    battles.push({
      type: 'normal',
      difficulty: 'medium',
      cr: 0.25,
      goldReward: 48,
    })
  }

  for (let i = 0; i < 4; i++) {
    battles.push({
      type: 'normal',
      difficulty: 'medium',
      cr: 0.5,
      goldReward: 50,
    })
  }

  for (let i = 0; i < 2; i++) {
    battles.push({
      type: 'normal',
      difficulty: 'medium',
      goldReward: 52,
      cr: 1,
    })
  }

  battles.sort(() => Math.random() - 0.5)

  battles.push({
    type: 'mini-boss',
    cr: 2,
    monsterIndex: 'sea-hag',
    difficulty: 'boss-full',
    firstGoldReward: 1080,
    goldReward: 52,
  })

  return battles
}

function generateHuntFiveBattles() {
  const battles = []

  for (let i = 0; i < 4; i++) {
    battles.push({
      type: 'normal',
      difficulty: 'medium',
      cr: 0.25,
      goldReward: 48,
    })
  }

  for (let i = 0; i < 4; i++) {
    battles.push({
      type: 'normal',
      difficulty: 'medium',
      cr: 0.5,
      goldReward: 56,
    })
  }

  for (let i = 0; i < 2; i++) {
    battles.push({
      type: 'normal',
      difficulty: 'medium',
      goldReward: 58,
      cr: 1,
    })
  }

  battles.sort(() => Math.random() - 0.5)

  // Add the mini-boss at the end
  battles.push({
    type: 'mini-boss',
    cr: 4,
    monsterIndex: 'red-dragon-wyrmling',
    difficulty: 'boss-strong',
    firstGoldReward: 2200,
    goldReward: 75,
  })

  return battles
}

module.exports = { levelData }
