module.exports = {
  key: 'page1',
  name: 'Hunt Page 1 - Wyrmling’s Trial',
  description: `Oryzinax, a red dragon wyrmling, has made a lair in the mountains above Harvest Hill. You must strike it down while it's still young before it grows to full power.`,
  finalBoss: 'red-dragon-wyrmling',
  hunts: [
    {
      id: 1,
      key: 'hunt1',
      name: 'Giant Fire Beetle',
      description: 'Your first test. Use your SPELLSWORD for an advantage.',
      energyCost: 1,
      totalBattles: 4,
      battles: [
        { type: 'normal', monsterIndex: 'hyena', difficulty: 4, goldReward: 24 }, // hp 4
        { type: 'normal', monsterIndex: 'shrieker', difficulty: 6, goldReward: 26 }, // 6 (13)
        { type: 'normal', monsterIndex: 'crab', difficulty: 6, goldReward: 28 }, //6 (2)
        {
          type: 'mini-boss',
          monsterIndex: 'giant-fire-beetle', // 8 (4)
          difficulty: 8,
          firstGoldReward: 55,
          goldReward: 23,
        },
      ],
      unlocks: 'hunt2',
    },
    {
      id: 2,
      key: 'hunt2',
      name: 'Imp',
      description: `Second Test. Use STEALTH against magical creatures.`,
      energyCost: 1,
      totalBattles: 4,
      battles: [
        { type: 'normal', monsterIndex: 'sprite', difficulty: 6, goldReward: 25 }, // 6 (2)
        { type: 'normal', monsterIndex: 'quasit', difficulty: 7, goldReward: 27 }, // 7
        { type: 'normal', monsterIndex: 'blink-dog', difficulty: 8, goldReward: 31 }, //(8) 22
        {
          type: 'mini-boss',
          monsterIndex: 'imp', // 10
          difficulty: 10,
          firstGoldReward: 70,
          goldReward: 25,
        },
      ],
      unlocks: 'hunt3',
    },
    {
      id: 3,
      key: 'hunt3',
      name: 'Hobgoblin',
      description: `Your final test. Use BRUTE strength to punch through these villains.`,
      energyCost: 1,
      totalBattles: 5,
      battles: [
        { type: 'normal', monsterIndex: 'orc', difficulty: 7, goldReward: 31 }, // 7 (15)
        { type: 'normal', monsterIndex: 'goblin', difficulty: 7, goldReward: 45 }, // 7
        { type: 'normal', monsterIndex: 'kobold', difficulty: 5, goldReward: 48 }, // 5
        { type: 'normal', monsterIndex: 'drow', difficulty: 8, goldReward: 51 }, // 8
        {
          type: 'mini-boss',
          monsterIndex: 'hobgoblin', // 11
          difficulty: 11,
          firstGoldReward: 1049,
          goldReward: 45,
        },
      ],
      unlocksPage: 'page2',
    },
  ],
}
