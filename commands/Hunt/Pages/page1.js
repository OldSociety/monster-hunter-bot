module.exports = {
  key: 'page1',
  name: 'Hunt Page 1 - Wyrmling’s Trial',
  description: 'Oryzinax, a red dragon wyrmling, has made a lair in the mountains above Harvest Hill. You must strike it down while its still young.',
  finalBoss: 'red-dragon-wyrmling',
  hunts: [
    {
      id: 1,
      key: 'hunt1',
      name: 'Darkmantle',
      description: 'Your hunt begins here...',
      energyCost: 1,
      totalBattles: 3,
      battles: [
        { type: 'normal', monsterIndex: 'goblin', difficulty: 'medium', goldReward: 24 }, // hp 7
        { type: 'normal', monsterIndex: 'giant-rat', difficulty: 'medium', goldReward: 24 }, // 9
        { type: 'normal', monsterIndex: 'magmin', difficulty: 'medium', goldReward: 24 }, //9
        {
          type: 'mini-boss',
          monsterIndex: 'darkmantle', // 16
          difficulty: 'boss-half',
          firstGoldReward: 700,
          goldReward: 28,
        },
      ],
      unlocks: 'hunt2',
    },
    {
      id: 2,
      key: 'hunt2',
      name: 'Harpy',
      description: 'Take down the harpy by avoiding her song.',
      energyCost: 1,
      totalBattles: 5,
      battles: [
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 'normal', goldReward: 26 }, // 11
        { type: 'normal', monsterIndex: 'ape', difficulty: 'easy', goldReward: 26 }, // 9
        { type: 'normal', monsterIndex: 'imp', difficulty: 'normal', goldReward: 28 }, // 10
        { type: 'normal', monsterIndex: 'tribal-warrior', difficulty: 'normal', goldReward: 28 }, //11
        {
          type: 'mini-boss',
          monsterIndex: 'harpy', // 19
          difficulty: 'boss-half',
          firstGoldReward: 650,
          goldReward: 32,
        },
      ],
      unlocks: 'hunt3',
    },
    {
      id: 3,
      key: 'hunt3',
      name: 'Rust Monster',
      description:
        'An army will be left unarmed if the rust monster is not hunted.',
      energyCost: 1,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'drow', difficulty: 'normal', goldReward: 48 }, // 13
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 'normal', goldReward: 48 }, // 
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 'normal', goldReward: 50 }, // 
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 'normal', goldReward: 50 }, // 
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 'normal', goldReward: 50 }, // 
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 'normal', goldReward: 52 }, // 
        {
          type: 'mini-boss',
          monsterIndex: 'rust-monster', // 
          difficulty: 'boss-full',
          firstGoldReward: 980,
          goldReward: 52,
        },
      ],
      unlocks: 'hunt4',
    },
    {
      id: 4,
      key: 'hunt4',
      name: 'Sea Hag',
      description:
        'Kill the sea hag before more fall under her drowned man curse!',
      energyCost: 1,
      totalBattles: 10,
      battles: [
        { type: 'normal', cr: 0.25, difficulty: 'medium', goldReward: 48 }, // 
        { type: 'normal', cr: 0.25, difficulty: 'medium', goldReward: 48 }, // 
        { type: 'normal', cr: 0.25, difficulty: 'medium', goldReward: 48 }, // 
        { type: 'normal', cr: 0.5, difficulty: 'medium', goldReward: 50 }, // 
        { type: 'normal', cr: 0.5, difficulty: 'medium', goldReward: 50 }, // 
        { type: 'normal', cr: 0.5, difficulty: 'medium', goldReward: 50 }, // 
        { type: 'normal', cr: 1, difficulty: 'medium', goldReward: 52 }, // 
        { type: 'normal', cr: 1, difficulty: 'medium', goldReward: 52 }, // 
        {
          type: 'mini-boss',
          monsterIndex: 'sea-hag', // 
          difficulty: 'boss-full',
          firstGoldReward: 1080,
          goldReward: 52,
        },
      ],
      unlocks: 'hunt5',
    },
    {
      id: 5,
      key: 'hunt5',
      name: 'Red Dragon Wyrmling',
      description: `Finally it's time to slay Oryzinax and prove your worth!`,
      energyCost: 1,
      totalBattles: 10,
      battles: [
        { type: 'normal', cr: 0.25, difficulty: 'medium', goldReward: 48 }, // 
        { type: 'normal', cr: 0.25, difficulty: 'medium', goldReward: 48 }, // 
        { type: 'normal', cr: 0.25, difficulty: 'medium', goldReward: 48 }, // 
        { type: 'normal', cr: 0.25, difficulty: 'medium', goldReward: 48 }, // 
        { type: 'normal', cr: 0.5, difficulty: 'medium', goldReward: 56 }, // 
        { type: 'normal', cr: 0.5, difficulty: 'medium', goldReward: 56 }, // 
        { type: 'normal', cr: 1, difficulty: 'medium', goldReward: 58 }, // 
        { type: 'normal', cr: 1, difficulty: 'medium', goldReward: 58 }, // 
        { type: 'normal', cr: 1, difficulty: 'medium', goldReward: 58 }, // 
        { type: 'normal', cr: 1, difficulty: 'medium', goldReward: 58 }, // 
        {
          type: 'mini-boss',
          monsterIndex: 'red-dragon-wyrmling', // 
          difficulty: 'boss-strong',
          firstGoldReward: 1540,
          goldReward: 75,
        },
      ],
      unlocksPage: 'page2',
    },
  ],
}
