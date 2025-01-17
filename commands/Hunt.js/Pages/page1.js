module.exports = {
  key: 'page1',
  name: 'Hunt Page 1 - Wyrmling’s Trial',
  description: 'Defeat a series of monsters to reach the Red Dragon Wyrmling.',
  finalBoss: 'red-dragon-wyrmling',
  hunts: [
    {
      key: 'hunt1',
      name: 'Darkmantle',
      description: 'Your hunt begins here...',
      energyCost: 1,
      totalBattles: 3,
      battles: generateDarkmantleBattles(),
      unlocks: 'hunt2',
    },
    {
      key: 'hunt2',
      name: 'Harpy',
      description: 'Take down the harpy by avoiding her song.',
      energyCost: 1,
      totalBattles: 5,
      battles: generateHarpyBattles(),
      unlocks: 'hunt3',
    },
    {
      key: 'hunt3',
      name: 'Rust Monster',
      description:
        'An army will be left unarmed if the rust monster is not hunted.',
      energyCost: 1,
      totalBattles: 8,
      battles: generateRustMonsterBattles(),
      unlocks: 'hunt4',
    },
    {
      key: 'hunt4',
      name: 'Sea Hag',
      description:
        'Kill the sea hag before more fall under her drowned man curse!',
      energyCost: 1,
      totalBattles: 10,
      battles: generateSeaHagBattles(),
      unlocks: 'hunt5',
    },
    {
      key: 'hunt5',
      name: 'Red Dragon Wyrmling (Boss)',
      description: 'Face the Red Dragon Wyrmling to prove your worth!',
      energyCost: 1,
      totalBattles: 10,
      battles: generateRedDragonBattles(),
      unlocksPage: 'page2', // Unlocks the next page upon completion
    },
  ],
}

function generateDarkmantleBattles() {
  return [
    {
      type: 'normal',
      cr: 0,
      difficulty: 'easy',
      firstGoldReward: 700,
      goldReward: 24,
    },
  ]
}
function generateHarpyBattles() {
  return [
    {
      type: 'mini-boss',
      cr: 2,
      monsterIndex: 'harpy',
      difficulty: 'boss-half',
      firstGoldReward: 650,
      goldReward: 32,
    },
  ]
}
function generateRustMonsterBattles() {
  return [
    {
      type: 'mini-boss',
      cr: 2,
      monsterIndex: 'rust-monster',
      difficulty: 'boss-full',
      firstGoldReward: 980,
      goldReward: 52,
    },
  ]
}
function generateSeaHagBattles() {
  return [
    {
      type: 'mini-boss',
      cr: 2,
      monsterIndex: 'sea-hag',
      difficulty: 'boss-full',
      firstGoldReward: 1080,
      goldReward: 52,
    },
  ]
}
function generateRedDragonBattles() {
  return [
    {
      type: 'boss',
      cr: 4,
      monsterIndex: 'red-dragon-wyrmling',
      difficulty: 'boss-strong',
      firstGoldReward: 1540,
      goldReward: 75,
    },
  ]
}
