module.exports = {
  key: 'page2',
  name: 'Hunt Page 2 - Wyrmling’s Trial',
  description: `Oryzinax, a red dragon wyrmling, has made a lair in the mountains above Harvest Hill. You must strike it down while it's still young before it grows to full power.`,
  finalBoss: 'red-dragon-wyrmling',
  hunts: [
    {
      id: 4,
      key: 'hunt4',
      name: 'Darkmantle',
      description: 'Your hunt begins in the shadows—track down the darkmantle lurking nearby and test your strength.',
      energyCost: 1,
      totalBattles: 3,
      battles: [
        { type: 'normal', monsterIndex: 'goblin', difficulty: 1, goldReward: 24 }, // hp 7
        { type: 'normal', monsterIndex: 'giant-rat', difficulty: 1, goldReward: 26 }, // 9
        { type: 'normal', monsterIndex: 'magmin', difficulty: 1, goldReward: 28 }, //9
        {
          type: 'mini-boss',
          monsterIndex: 'darkmantle', // 16
          difficulty: 0.5,
          firstGoldReward: 70,
          goldReward: 28,
        },
      ],
      unlocks: 'hunt5',
    },
    {
      id: 5,
      key: 'hunt5',
      name: 'Harpy',
      description: `A harpy's song to soothes the weary and her claws shred men into meat.`,
      energyCost: 1,
      totalBattles: 5,
      battles: [
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 1, goldReward: 25 }, // 11
        { type: 'normal', monsterIndex: 'ape', difficulty: 0.5, goldReward: 27 }, // 9
        { type: 'normal', monsterIndex: 'imp', difficulty: 1, goldReward: 29 }, // 10
        { type: 'normal', monsterIndex: 'tribal-warrior', difficulty: 1, goldReward: 31 }, //11
        {
          type: 'mini-boss',
          monsterIndex: 'harpy', // 19
          difficulty: 0.5,
          firstGoldReward: 90,
          goldReward: 32,
        },
      ],
      unlocks: 'hunt6',
    },
    {
      id: 6,
      key: 'hunt6',
      name: 'Rust Monster',
      description:
        `A nearby rust monster threatens an army's steel—destroy it before it's left defenseless.`,
      energyCost: 1,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'drow', difficulty: 1, goldReward: 26 }, // 13
        { type: 'normal', monsterIndex: 'orc', difficulty: 1, goldReward: 28 }, // 15
        { type: 'normal', monsterIndex: 'camel', difficulty: 1, goldReward: 30 }, // 15
        { type: 'normal', monsterIndex: 'lemure', difficulty: 1, goldReward: 32 }, // 13
        { type: 'normal', monsterIndex: 'ape', difficulty: 1, goldReward: 34 }, // 19
        { type: 'normal', monsterIndex: 'flying-sword', difficulty: 1, goldReward: 27 }, // 17
        { type: 'normal', monsterIndex: 'deep-gnome-svirfneblin', difficulty: 1, goldReward: 29 }, // 16
        {
          type: 'mini-boss',
          monsterIndex: 'rust-monster', // 27
          difficulty: 1.5,
          firstGoldReward: 80,
          goldReward: 52,
        },
      ],
      unlocks: 'hunt7',
    },
    {
      id: 7,
      key: 'hunt7',
      name: 'Sea Hag',
      description:
        `End the sea hag’s curse before more fall victim to her drowned man curse.`,
      energyCost: 1,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'animated-armor', difficulty: 1, goldReward: 31 }, // 33
        { type: 'normal', monsterIndex: 'azer', difficulty: 1, goldReward: 33 }, // 39
        { type: 'normal', monsterIndex: 'ettercap', difficulty: 1, goldReward: 70 }, // 44
        { type: 'normal', monsterIndex: 'black-dragon-wyrmling', difficulty: '1', goldReward: 28 }, // 32
        { type: 'normal', monsterIndex: 'dire-wolf', difficulty: 1, goldReward: 30 }, // 37
        { type: 'normal', monsterIndex: 'blink-dog', difficulty: 1.5, goldReward: 32 }, // 33
        { type: 'normal', monsterIndex: 'dryad', difficulty: 1.5, goldReward: 34 }, // 33
        { type: 'normal', monsterIndex: 'cockatrice', difficulty: 1, goldReward: 36 }, // 27
        {
          type: 'mini-boss',
          monsterIndex: 'sea-hag', // 52
          difficulty: 1.3,
          firstGoldReward: 80,
          goldReward: 52,
        },
      ],
      unlocks: 'hunt8',
    },
    {
      id: 8,
      key: 'hunt8',
      name: 'Red Dragon Wyrmling',
      description: `The time has come to face Oryzinax—slay the wyrmling before Harvest Hill burns.`,
      energyCost: 2,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'bandit-captain', difficulty: 1, goldReward: 31 }, // 65
        { type: 'normal', monsterIndex: 'satyr', difficulty: 1.5, goldReward: 45 }, // 45
        { type: 'normal', monsterIndex: 'duergar', difficulty: 1, goldReward: 48 }, // 39
        { type: 'normal', monsterIndex: 'knight', difficulty: 1, goldReward: 51 }, // 52
        { type: 'normal', monsterIndex: 'green-hag', difficulty: 1, goldReward: 54 }, // 82
        { type: 'normal', monsterIndex: 'werewolf-hybrid', difficulty: 1, goldReward: 57 }, // 58
        { type: 'normal', monsterIndex: 'veteran', difficulty: 1, goldReward: 60 }, // 58
        { type: 'normal', monsterIndex: 'ochre-jelly', difficulty: 1, goldReward: 63 }, // 67
        { type: 'normal', monsterIndex: 'succubus-incubus', difficulty: 1, goldReward: 58 }, // 66
        {
          type: 'mini-boss',
          monsterIndex: 'red-dragon-wyrmling', // 93
          difficulty: 1.25,
          firstGoldReward: 300,
          goldReward: 75,
        },
      ],
      unlocksPage: 'page3',
    },
  ],
}
