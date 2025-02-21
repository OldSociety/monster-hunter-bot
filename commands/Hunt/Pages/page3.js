module.exports = {
  key: 'page3',
  name: 'Hunt Page 3 - Curse of Maud',
  description:
    `The city of Dax is under a vampire's curse. Uncover the truth behind Maud, the cleric who hides her dark nature, and stop the bloodshed before it consumes the city.`,
  finalBoss: 'vampire-vampire',
  hunts: [
    {
      id: 9,
      key: 'hunt9',
      name: 'Bandit Captain',
      description: `Follow the bandits who may know Maud’s true identity—her reign of terror is only beginning.`,
      energyCost: 1,
      totalBattles: 6,
      battles: [
        { type: 'normal', monsterIndex: 'gelatinous-cube', difficulty: 84, goldReward: 43 }, // 84
        { type: 'normal', monsterIndex: 'wereboar-hybrid', difficulty: 78, goldReward: 45 }, // 78
        { type: 'normal', monsterIndex: 'minotaur', difficulty: 76, goldReward: 47 }, // 76
        { type: 'normal', monsterIndex: 'lamia', difficulty: 87, goldReward: 49 }, // 97
        { type: 'normal', monsterIndex: 'nightmare', difficulty: 92, goldReward: 51 }, // 102
        {
          type: 'mini-boss',
          monsterIndex: 'bandit-captain',
          difficulty: 1.5, // 97
          firstGoldReward: 297,
          goldReward: 55,
        },
      ],
      unlocks: 'hunt10',
    },
    {
      id: 10,
      key: 'hunt10',
      name: 'Gibbering Mouther',
      description: `Due to your own foolishness, you fell into the bandit's trap.`,
      energyCost: 1,
      totalBattles: 6,
      battles: [
        { type: 'normal', monsterIndex: 'fire-elemental', difficulty: 82, goldReward: 44 }, // 102
        { type: 'normal', monsterIndex: 'flesh-golem', difficulty: 93, goldReward: 46 }, // 93
        { type: 'normal', monsterIndex: 'couatl', difficulty: 97, goldReward: 48 }, // 97
        { type: 'normal', monsterIndex: 'chimera', difficulty: 98, goldReward: 50 }, // 114
        { type: 'normal', monsterIndex: 'gladiator', difficulty: 102, goldReward: 52 }, // 112
        {
          type: 'mini-boss',
          monsterIndex: 'gibbering-mouther', // 110
          difficulty: 110,
          firstGoldReward: 285,
          goldReward: 57,
        },
      ],
      unlocks: 'hunt11',
    },
    {
      id: 11,
      key: 'hunt11',
      name: 'Vampire Spawn',
      description: `Maud’s spawn lurks in the harbor, spreading her blood curse—unmask the Maud true identity.`,
      energyCost: 1,
      totalBattles: 6,
      battles: [
        { type: 'normal', monsterIndex: 'night-hag', difficulty: 112, goldReward: 45 }, // 112
        { type: 'normal', monsterIndex: 'bone-devil', difficulty: 110, goldReward: 47 }, // 110
        { type: 'normal', monsterIndex: 'lich', difficulty: 115, goldReward: 49 }, // 135
        { type: 'normal', monsterIndex: 'medusa', difficulty: 120, goldReward: 51 }, // 127
        { type: 'normal', monsterIndex: 'stone-giant', difficulty: 122, goldReward: 53 }, // 126
        {
          type: 'mini-boss',
          monsterIndex: 'vampire-spawn', // 123
          difficulty: 123,
          firstGoldReward: 296,
          goldReward: 59,
        },
      ],
      unlocks: 'hunt12',
    },
    {
      id: 12,
      key: 'hunt12',
      name: 'Deva',
      description:
        `Before he can speak, the spawn burns. Break Maud's influence to set the deva free.`,
      energyCost: 2,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'chuul', difficulty: 135, goldReward: 46 }, // 135
        { type: 'normal', monsterIndex: 'mummy-lord', difficulty: 135, goldReward: 48 }, // 135
        { type: 'normal', monsterIndex: 'vrock', difficulty: 152, goldReward: 50 }, // 152
        { type: 'normal', monsterIndex: 'archmage', difficulty: 145, goldReward: 52 }, // 145
        { type: 'normal', monsterIndex: 'bulette', difficulty: 140, goldReward: 47 }, // 140
        { type: 'normal', monsterIndex: 'chain-devil', difficulty: 139, goldReward: 51 }, // 129
        { type: 'normal', monsterIndex: 'invisible-stalker', difficulty: 150, goldReward: 53 }, // 156
        {
          type: 'mini-boss',
          monsterIndex: 'deva', // 204
          difficulty: 1.3,
          firstGoldReward: 304,
          goldReward: 55,
        },
      ],
      unlocks: 'hunt13',
    },
    {
      id: 13,
      key: 'hunt13',
      name: 'Chimera',
      description:
        `Maud's real name is Ezmerelda, the city cleric. Fight your way to her and end this madness.`,
      energyCost: 1,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'ettin', difficulty: 85, goldReward: 48 }, // 85
        { type: 'normal', monsterIndex: 'wyvern', difficulty: 110, goldReward: 50 }, // 110
        { type: 'normal', monsterIndex: 'rakshasa', difficulty: 110, goldReward: 52 }, // 110
        { type: 'normal', monsterIndex: 'mammoth', difficulty: 126, goldReward: 54 }, // 126
        { type: 'normal', monsterIndex: 'aboleth', difficulty: 135, goldReward: 56 }, // 135 
        { type: 'normal', monsterIndex: 'weretiger-hybrid', difficulty: 120, goldReward: 49 }, // 120
        { type: 'normal', monsterIndex: 'bearded-devil', difficulty: 110, goldReward: 51 }, // 110
        {
          type: 'mini-boss',
          monsterIndex: 'chimera', // 172
          difficulty: 172,
          firstGoldReward: 306,
          goldReward: 70,
        },
      ],
      unlocks: 'hunt14',
    },
    {
      id: 14,
      key: 'hunt14',
      name: 'Gorgon',
      description:
        `As Maud’s dark magic warps the city, she calls upon a Gorgon to stop your hunt.`,
      energyCost: 1,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'tyrannosaurus-rex', difficulty: 136, goldReward: 63 }, // 136
        { type: 'normal', monsterIndex: 'treant', difficulty: 138, goldReward: 65 }, // 138
        { type: 'normal', monsterIndex: 'gynosphinx', difficulty: 136, goldReward: 67 }, // 136 
        { type: 'normal', monsterIndex: 'shield-guardian', difficulty: 142, goldReward: 69 }, // 142
        { type: 'normal', monsterIndex: 'young-green-dragon', difficulty: 136, goldReward: 71 }, // 136
        { type: 'normal', monsterIndex: 'vampire-mist', difficulty: 144, goldReward: 64 }, // 144
        { type: 'normal', monsterIndex: 'shambling-mound', difficulty: 136, goldReward: 66 }, // 136
        {
          type: 'mini-boss',
          monsterIndex: 'gorgon', // 172
          difficulty: 172,
          firstGoldReward: 308,
          goldReward: 68,
        },
      ],
      unlocks: 'hunt15',
    },
    {
      id: 15,
      key: 'hunt15',
      name: 'Vampire Lord Maud',
      description: `You fight your way to kneel on the steps of the Church of Light. It's time to end this.`,
      energyCost: 2,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'vampire-spawn', difficulty: 164, goldReward: 75 }, // 164
        { type: 'normal', monsterIndex: 'ettin', difficulty: 157, goldReward: 77 }, // 127
        { type: 'normal', monsterIndex: 'ogre-zombie', difficulty: 170, goldReward: 79 }, // 170
        { type: 'normal', monsterIndex: 'air-elemental', difficulty: 135, goldReward: 81 }, // 135
        { type: 'normal', monsterIndex: 'spirit-naga', difficulty: 125, goldReward: 83 }, // 105
        { type: 'normal', monsterIndex: 'troll', difficulty: 168, goldReward: 84 }, // 168
        { type: 'normal', monsterIndex: 'green-hag', difficulty: 164, goldReward: 87 }, // 164
        { type: 'normal', monsterIndex: 'lamia', difficulty: 194, goldReward: 89 }, // 194
        { type: 'normal', monsterIndex: 'hill-giant', difficulty: 210, goldReward: 90 }, // 210
        {
          type: 'boss',
          monsterIndex: 'vampire-vampire', // 288
          difficulty: 288,
          firstGoldReward: 2025,
          goldReward: 93,
        },
      ],
      unlocksPage: 'page4',
    },
  ],
}
