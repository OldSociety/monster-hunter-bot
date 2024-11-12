// huntLevels.js

const levelData = {
  hunt1: {
    key: 'hunt1',
    name: 'Orc',
    description: 'You hunt begins here...',
    energyCost: 1,
    battles: generateHuntOneBattles(),
  },
  hunt2: {
    key: 'hunt2',
    name: 'Harpy',
    description: 'Take down the harpy by avoiding her song.',
    energyCost: 1,
    battles: generateHuntTwoBattles(),
  },
  hunt3: {
    key: 'hunt3',
    name: 'Sea Hag',
    description:
      'Kill the sea hag before more fall under her drowned man curse!',
    energyCost: 1,
    battles: generateHuntThreeBattles(),
  },
  // Future levels can be added here
}

function generateHuntOneBattles() {
  const battles = []

  // Add 3 battles with CR 0
  for (let i = 0; i < 3; i++) {
    battles.push({
      type: 'normal',
      cr: 0,
    })
  }

  // Shuffle the battles to randomize the order
  battles.sort(() => Math.random() - 0.5)

  // Add the mini-boss at the end
  battles.push({
    type: 'mini-boss',
    cr: 0.25,
    monsterIndex: 'orc',
  })

  return battles
}

function generateHuntTwoBattles() {
  const battles = []

  // Add 2 battles with CR 1/4
  for (let i = 0; i < 4; i++) {
    battles.push({
      type: 'normal',
      cr: 0.25,
    })
  }

  // Add 3 battles with CR 1/2
  for (let i = 0; i < 5; i++) {
    battles.push({
      type: 'normal',
      cr: 0.5,
    })
  }

  // Shuffle the battles to randomize the order
  battles.sort(() => Math.random() - 0.5)

  // Add the mini-boss at the end
  battles.push({
    type: 'mini-boss',
    cr: 2,
    monsterIndex: 'sea-hag',
  })

  return battles
}

function generateHuntThreeBattles() {
  const battles = []

  // Add 4 battles with CR 1/4
  for (let i = 0; i < 4; i++) {
    battles.push({
      type: 'normal',
      cr: 0.25,
    })
  }

  // Add 5 battles with CR 1/2
  for (let i = 0; i < 5; i++) {
    battles.push({
      type: 'normal',
      cr: 0.5,
    })
  }

  // Add 2 battles with CR 1
  for (let i = 0; i < 2; i++) {
    battles.push({
      type: 'normal',
      cr: 1,
    })
  }

  // Shuffle the battles to randomize the order
  battles.sort(() => Math.random() - 0.5)

  // Add the mini-boss at the end
  battles.push({
    type: 'mini-boss',
    cr: 2,
    monsterIndex: 'sea-hag',
  })

  return battles
}

module.exports = { levelData }
