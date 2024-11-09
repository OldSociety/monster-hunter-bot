// huntLevels.js

const levelData = {
  hunt1: {
    key: 'hunt1',
    name: 'Hunt 1',
    description: 'Face a series of increasingly challenging monsters!',
    energyCost: 1,
    battles: generateHuntOneBattles(),
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

  // Add 5 battles with CR 1/8
  for (let i = 0; i < 5; i++) {
    battles.push({
      type: 'normal',
      cr: 0.125,
    })
  }

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

  // Add 3 battles with CR 1
  for (let i = 0; i < 3; i++) {
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
