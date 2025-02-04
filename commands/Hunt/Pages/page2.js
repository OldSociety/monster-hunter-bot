module.exports = {
  key: 'page2',
  name: 'Hunt Page 2 - Curse of Maud',
  description:
    `The city of Dax is under a vampire's curse. Uncover the truth behind Maud, the cleric who hides her dark nature, and stop the bloodshed before it consumes the city.`,
  finalBoss: 'vampire-vampire',
  hunts: [
    {
      id: 6,
      key: 'hunt6',
      name: 'Bandit Captain',
      description: `Follow the bandits who may know Maud’s true identity—her reign of terror is only beginning.`,
      energyCost: 2,
      totalBattles: 6,
      battles: [
        { type: 'normal', monsterIndex: 'gelatinous-cube', difficulty: 1, goldReward: 43 }, // 84
        { type: 'normal', monsterIndex: 'wereboar-hybrid', difficulty: 1, goldReward: 45 }, // 78
        { type: 'normal', monsterIndex: 'minotaur', difficulty: 1, goldReward: 47 }, // 76
        { type: 'normal', monsterIndex: 'lamia', difficulty: 1, goldReward: 49 }, // 97
        { type: 'normal', monsterIndex: 'nightmare', difficulty: 1.5, goldReward: 51 }, // 102
        {
          type: 'mini-boss',
          monsterIndex: 'bandit-captain',
          difficulty: 1.5, // 97
          firstGoldReward: 80,
          goldReward: 55,
        },
      ],
      unlocks: 'hunt7',
    },
    {
      id: 7,
      key: 'hunt7',
      name: 'Gibbering Mouther',
      description: `Due to your own foolishness, you fell into the bandit's trap.`,
      energyCost: 1.5,
      totalBattles: 6,
      battles: [
        { type: 'normal', monsterIndex: 'fire-elemental', difficulty: 1, goldReward: 44 }, // 102
        { type: 'normal', monsterIndex: 'flesh-golem', difficulty: 1, goldReward: 46 }, // 93
        { type: 'normal', monsterIndex: 'couatl', difficulty: 1, goldReward: 48 }, // 97
        { type: 'normal', monsterIndex: 'chimera', difficulty: 1, goldReward: 50 }, // 114
        { type: 'normal', monsterIndex: 'gladiator', difficulty: 1, goldReward: 52 }, // 112
        {
          type: 'mini-boss',
          monsterIndex: 'gibbering-mouther', // 110
          difficulty: 2,
          firstGoldReward: 85,
          goldReward: 57,
        },
      ],
      unlocks: 'hunt8',
    },
    {
      id: 8,
      key: 'hunt8',
      name: 'Vampire Spawn',
      description: `Maud’s spawn lurks in the harbor, spreading her blood curse—unmask the Maud true identity.`,
      energyCost: 2,
      totalBattles: 6,
      battles: [
        { type: 'normal', monsterIndex: 'night-hag', difficulty: 1, goldReward: 45 }, // 112
        { type: 'normal', monsterIndex: 'bone-devil', difficulty: 1, goldReward: 47 }, // 110
        { type: 'normal', monsterIndex: 'lich', difficulty: 1, goldReward: 49 }, // 135
        { type: 'normal', monsterIndex: 'medusa', difficulty: 1, goldReward: 51 }, // 127
        { type: 'normal', monsterIndex: 'stone-giant', difficulty: 1, goldReward: 53 }, // 126
        {
          type: 'mini-boss',
          monsterIndex: 'vampire-spawn', // 123
          difficulty: 1.5,
          firstGoldReward: 96,
          goldReward: 59,
        },
      ],
      unlocks: 'hunt9',
    },
    {
      id: 9,
      key: 'hunt9',
      name: 'Deva',
      description:
        `Before he can speak, the spawn burns. Break Maud's influence to set the deva free.`,
      energyCost: 3,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'chuul', difficulty: 1.5, goldReward: 46 }, // 135
        { type: 'normal', monsterIndex: 'mummy-lord', difficulty: 1.5, goldReward: 48 }, // 135
        { type: 'normal', monsterIndex: 'vrock', difficulty: 1.5, goldReward: 50 }, // 152
        { type: 'normal', monsterIndex: 'archmage', difficulty: 1.5, goldReward: 52 }, // 145
        { type: 'normal', monsterIndex: 'bulette', difficulty: 1.5, goldReward: 47 }, // 140
        { type: 'normal', monsterIndex: 'chain-devil', difficulty: 1.5, goldReward: 51 }, // 129
        { type: 'normal', monsterIndex: 'invisible-stalker', difficulty: 1.5, goldReward: 53 }, // 156
        {
          type: 'mini-boss',
          monsterIndex: 'deva', // 204
          difficulty: 1.5,
          firstGoldReward: 118,
          goldReward: 55,
        },
      ],
      unlocks: 'hunt10',
    },
    {
      id: 10,
      key: 'hunt10',
      name: 'Chimera',
      description:
        `Maud's real name is Ezmerelda, the city cleric. Fight your way to her and end this madness.`,
      energyCost: 2,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'ettin', difficulty: 1, goldReward: 48 }, // 85
        { type: 'normal', monsterIndex: 'wyvern', difficulty: 1, goldReward: 50 }, // 110
        { type: 'normal', monsterIndex: 'rakshasa', difficulty: 1, goldReward: 52 }, // 110
        { type: 'normal', monsterIndex: 'mammoth', difficulty: 1, goldReward: 54 }, // 126
        { type: 'normal', monsterIndex: 'aboleth', difficulty: 1, goldReward: 56 }, // 135 
        { type: 'normal', monsterIndex: 'weretiger-hybrid', difficulty: 1, goldReward: 49 }, // 120
        { type: 'normal', monsterIndex: 'bearded-devil', difficulty: 1, goldReward: 51 }, // 110
        {
          type: 'mini-boss',
          monsterIndex: 'chimera', // 172
          difficulty: 1.5,
          firstGoldReward: 106,
          goldReward: 70,
        },
      ],
      unlocks: 'hunt11',
    },
    {
      id: 11,
      key: 'hunt11',
      name: 'Gorgon',
      description:
        `As Maud’s dark magic warps the city, she calls upon a Gorgon to stop your hunt.`,
      energyCost: 2,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'tyrannosaurus-rex', difficulty: 1, goldReward: 63 }, // 136
        { type: 'normal', monsterIndex: 'treant', difficulty: 1, goldReward: 65 }, // 138
        { type: 'normal', monsterIndex: 'gynosphinx', difficulty: 1, goldReward: 67 }, // 136 
        { type: 'normal', monsterIndex: 'shield-guardian', difficulty: 1, goldReward: 69 }, // 142
        { type: 'normal', monsterIndex: 'young-green-dragon', difficulty: 1, goldReward: 71 }, // 136
        { type: 'normal', monsterIndex: 'vampire-mist', difficulty: 1, goldReward: 64 }, // 144
        { type: 'normal', monsterIndex: 'shambling-mound', difficulty: 1, goldReward: 66 }, // 136
        {
          type: 'mini-boss',
          monsterIndex: 'gorgon', // 172
          difficulty: 1.5,
          firstGoldReward: 108,
          goldReward: 68,
        },
      ],
      unlocks: 'hunt12',
    },
    {
      id: 12,
      key: 'hunt12',
      name: 'Vampire Lord Maud',
      description: `You fight your way to kneel on the steps of the Church of Light. It's time to end this.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'vampire-spawn', difficulty: 2, goldReward: 75 }, // 164
        { type: 'normal', monsterIndex: 'ettin', difficulty: 2, goldReward: 77 }, // 127
        { type: 'normal', monsterIndex: 'ogre-zombie', difficulty: 2, goldReward: 79 }, // 170
        { type: 'normal', monsterIndex: 'air-elemental', difficulty: 2, goldReward: 81 }, // 135
        { type: 'normal', monsterIndex: 'spirit-naga', difficulty: 2, goldReward: 83 }, // 105
        { type: 'normal', monsterIndex: 'troll', difficulty: 2, goldReward: 84 }, // 168
        { type: 'normal', monsterIndex: 'green-hag', difficulty: 2, goldReward: 87 }, // 164
        { type: 'normal', monsterIndex: 'lamia', difficulty: 2, goldReward: 89 }, // 194
        { type: 'normal', monsterIndex: 'hill-giant', difficulty: 2, goldReward: 90 }, // 210
        {
          type: 'boss',
          monsterIndex: 'vampire-vampire', // 288
          difficulty: 2,
          firstGoldReward: 225,
          goldReward: 93,
        },
      ],
      unlocksPage: 'page3',
    },
  ],
}
