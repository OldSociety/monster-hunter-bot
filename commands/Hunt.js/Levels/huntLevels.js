// huntLevels.js

const CR_VALUES = [0, 0.125, 0.25, 0.5, 1]

const levelData = {
  hunt1: {
    key: 'hunt1',
    name: 'Hunt Level 1',
    description: 'Face a series of increasingly challenging monsters!',
    energyCost: 1,
    battles: generateHuntOneBattles(),
  },
  hunt2: {
    key: 'hunt2',
    name: 'Hunt Level 2',
    description: 'New challenges await!',
    energyCost: 1,
    battles: generateHuntTwoBattles(), // To be implemented
  },
  // Future levels can be added here
}

function generateHuntOneBattles() {
  const battles = []

  for (const cr of CR_VALUES) {
    for (let i = 0; i < 4; i++) {
      battles.push({
        type: 'normal',
        cr: cr,
      })
    }
  }

  battles.sort(() => Math.random() - 0.5)

  battles.push({
    type: 'mini-boss',
    cr: 2,
    monsterIndex: 'sea-hag',
  })

  return battles
}

// Placeholder for Hunt 2
function generateHuntTwoBattles() {
  // Implementation for Hunt 2
  return []
}

module.exports = { levelData }
