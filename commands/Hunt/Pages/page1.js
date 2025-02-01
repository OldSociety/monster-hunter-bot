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
        { type: 'normal', monsterIndex: 'giant-rat', difficulty: 'medium', goldReward: 26 }, // 9
        { type: 'normal', monsterIndex: 'magmin', difficulty: 'medium', goldReward: 28 }, //9
        {
          type: 'mini-boss',
          monsterIndex: 'darkmantle', // 16
          difficulty: 'boss-half',
          firstGoldReward: 70,
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
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 'medium', goldReward: 25 }, // 11
        { type: 'normal', monsterIndex: 'ape', difficulty: 'easy', goldReward: 27 }, // 9
        { type: 'normal', monsterIndex: 'imp', difficulty: 'medium', goldReward: 29 }, // 10
        { type: 'normal', monsterIndex: 'tribal-warrior', difficulty: 'medium', goldReward: 31 }, //11
        {
          type: 'mini-boss',
          monsterIndex: 'harpy', // 19
          difficulty: 'boss-half',
          firstGoldReward: 90,
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
        { type: 'normal', monsterIndex: 'drow', difficulty: 'medium', goldReward: 26 }, // 13
        { type: 'normal', monsterIndex: 'orc', difficulty: 'medium', goldReward: 28 }, // 15
        { type: 'normal', monsterIndex: 'camel', difficulty: 'medium', goldReward: 30 }, // 15
        { type: 'normal', monsterIndex: 'lemure', difficulty: 'medium', goldReward: 32 }, // 13
        { type: 'normal', monsterIndex: 'ape', difficulty: 'medium', goldReward: 34 }, // 19
        { type: 'normal', monsterIndex: 'flying-sword', difficulty: 'medium', goldReward: 27 }, // 17
        { type: 'normal', monsterIndex: 'deep-gnome-svirfneblin', difficulty: 'medium', goldReward: 29 }, // 16
        {
          type: 'mini-boss',
          monsterIndex: 'rust-monster', // 27
          difficulty: 'boss-full',
          firstGoldReward: 80,
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
        { type: 'normal', monsterIndex: 'animated-armor', difficulty: 'medium', goldReward: 31 }, // 33
        { type: 'normal', monsterIndex: 'azer', difficulty: 'medium', goldReward: 33 }, // 39
        { type: 'normal', monsterIndex: 'ettercap', difficulty: 'medium', goldReward: 70 }, // 44
        { type: 'normal', monsterIndex: 'black-dragon-wyrmling', difficulty: 'normal', goldReward: 28 }, // 32
        { type: 'normal', monsterIndex: 'dire-wolf', difficulty: 'medium', goldReward: 30 }, // 37
        { type: 'normal', monsterIndex: 'blink-dog', difficulty: 'hard', goldReward: 32 }, // 33
        { type: 'normal', monsterIndex: 'dryad', difficulty: 'hard', goldReward: 34 }, // 33
        { type: 'normal', monsterIndex: 'cockatrice', difficulty: 'medium', goldReward: 36 }, // 27
        {
          type: 'mini-boss',
          monsterIndex: 'sea-hag', // 52
          difficulty: 'boss-full',
          firstGoldReward: 80,
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
      energyCost: 2,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'bandit-captain', difficulty: 'medium', goldReward: 31 }, // 65
        { type: 'normal', monsterIndex: 'satyr', difficulty: 'hard', goldReward: 45 }, // 45
        { type: 'normal', monsterIndex: 'duegar', difficulty: 'medium', goldReward: 48 }, // 39
        { type: 'normal', monsterIndex: 'knight', difficulty: 'medium', goldReward: 51 }, // 52
        { type: 'normal', monsterIndex: 'green-hag', difficulty: 'medium', goldReward: 54 }, // 82
        { type: 'normal', monsterIndex: 'werewolf-hybrid', difficulty: 'medium', goldReward: 57 }, // 58
        { type: 'normal', monsterIndex: 'veteran', difficulty: 'medium', goldReward: 60 }, // 58
        { type: 'normal', monsterIndex: 'ochre-jelly', difficulty: 'medium', goldReward: 63 }, // 67
        { type: 'normal', monsterIndex: 'succubus-incubus', difficulty: 'medium', goldReward: 58 }, // 66
        {
          type: 'mini-boss',
          monsterIndex: 'red-dragon-wyrmling', // 93
          difficulty: 'boss-strong',
          firstGoldReward: 300,
          goldReward: 75,
        },
      ],
      unlocksPage: 'page2',
    },
  ],
}
