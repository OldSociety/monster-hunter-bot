module.exports = {
  key: 'page3',
  name: `Hunt Page 3 - A Dragon's Revenge`,
  description:
    'Turns out Oryzinax was just a start. His brood are spreading across our land. Find Drokkenden and bring this to an end.',
  finalBoss: 'young-red-dragon',
  hunts: [
    {
      id: 13,
      key: 'hunt13',
      name: '',
      description: ``,
      energyCost: 1,
      totalBattles: 6,
      battles: [
        { type: 'normal', monsterIndex: 'gelatinous-cube', difficulty: 'medium', goldReward: 43 }, // 84
        { type: 'normal', monsterIndex: 'wereboar-hybrid', difficulty: 'medium', goldReward: 45 }, // 78
        { type: 'normal', monsterIndex: 'minotaur', difficulty: 'medium', goldReward: 47 }, // 76
        { type: 'normal', monsterIndex: 'lamia', difficulty: 'hard', goldReward: 49 }, // 97
        { type: 'normal', monsterIndex: 'nightmare', difficulty: 'hard', goldReward: 51 }, // 102
        {
          type: 'mini-boss',
          monsterIndex: '',
          difficulty: 'boss-strong', // 97
          firstGoldReward: 750,
          goldReward: 55,
        },
      ],
      unlocks: 'hunt14',
    },
    {
      id: 14,
      key: 'hunt14',
      name: '',
      description: ` `,
      energyCost: 1,
      totalBattles: 6,
      battles: [
        { type: 'normal', monsterIndex: 'fire-elemental', difficulty: 'medium', goldReward: 44 }, // 102
        { type: 'normal', monsterIndex: 'flesh-golem', difficulty: 'medium', goldReward: 46 }, // 93
        { type: 'normal', monsterIndex: 'couatl', difficulty: 'medium', goldReward: 48 }, // 97
        { type: 'normal', monsterIndex: 'chimera', difficulty: 'medium', goldReward: 50 }, // 114
        { type: 'normal', monsterIndex: 'gladiator', difficulty: 'medium', goldReward: 52 }, // 112
        {
          type: 'mini-boss',
          monsterIndex: '', // 110
          difficulty: 'boss-strong',
          firstGoldReward: 810,
          goldReward: 57,
        },
      ],
      unlocks: 'hunt15',
    },
    {
      id: 15,
      key: 'hunt15',
      name: '',
      description: ``,
      energyCost: 1,
      totalBattles: 7,
      battles: [
        { type: 'normal', monsterIndex: 'night-hag', difficulty: 'medium', goldReward: 45 }, // 112
        { type: 'normal', monsterIndex: 'bone-debil', difficulty: 'medium', goldReward: 47 }, // 110
        { type: 'normal', monsterIndex: 'lich', difficulty: 'medium', goldReward: 49 }, // 135
        { type: 'normal', monsterIndex: 'medusa', difficulty: 'medium', goldReward: 51 }, // 127
        { type: 'normal', monsterIndex: 'stone-giant', difficulty: 'medium', goldReward: 53 }, // 126
        {
          type: 'mini-boss',
          monsterIndex: '', // 123
          difficulty: 'boss-strong',
          firstGoldReward: 870,
          goldReward: 59,
        },
      ],
      unlocks: 'hunt16',
    },
    {
      id: 16,
      key: 'hunt16',
      name: '',
      description:
        '',
      energyCost: 2,
      totalBattles: 9,
      battles: [
        { type: 'normal', monsterIndex: 'chuul', difficulty: 'hard', goldReward: 46 }, // 135
        { type: 'normal', monsterIndex: 'mummy-lord', difficulty: 'hard', goldReward: 47 }, // 135
        { type: 'normal', monsterIndex: 'vrock', difficulty: 'hard', goldReward: 48 }, // 152
        { type: 'normal', monsterIndex: 'archmage', difficulty: 'hard', goldReward: 49 }, // 145
        { type: 'normal', monsterIndex: 'bulette', difficulty: 'hard', goldReward: 50 }, // 140
        { type: 'normal', monsterIndex: 'chain-devil', difficulty: 'hard', goldReward: 49 }, // 129
        { type: 'normal', monsterIndex: 'invisible-stalker', difficulty: 'hard', goldReward: 52 }, // 156
        {
          type: 'mini-boss',
          monsterIndex: 'deva', // 204
          difficulty: 'boss-strong',
          firstGoldReward: 1180,
          goldReward: 60,
        },
      ],
      unlocks: 'hunt17',
    },
    {
      id: 17,
      key: 'hunt17',
      name: '',
      description:
        ``,
      energyCost: 2,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'ettin', difficulty: 'medium', goldReward: 47 }, // 85
        { type: 'normal', monsterIndex: 'wyvern', difficulty: 'medium', goldReward: 47 }, // 110
        { type: 'normal', monsterIndex: 'rakshasa', difficulty: 'medium', goldReward: 49 }, // 110
        { type: 'normal', monsterIndex: 'mammoth', difficulty: 'medium', goldReward: 51 }, // 126
        { type: 'normal', monsterIndex: 'aboleth', difficulty: 'medium', goldReward: 51 }, // 135 
        { type: 'normal', monsterIndex: 'weretiger-hybrid', difficulty: 'medium', goldReward: 53 }, // 120
        { type: 'normal', monsterIndex: 'bearded-devil', difficulty: 'medium', goldReward: 55 }, // 110
        {
          type: 'mini-boss',
          monsterIndex: '', // 172
          difficulty: 'boss-strong',
          firstGoldReward: 930,
          goldReward: 70,
        },
      ],
      unlocks: 'hunt18',
    },
    {
      id: 18,
      key: 'hunt18',
      name: '',
      description:
        '',
      energyCost: 2,
      totalBattles: 8,
      battles: [
        { type: 'normal', monsterIndex: 'tyrannosaurus-rex', difficulty: 'medium', goldReward: 48 }, // 136
        { type: 'normal', monsterIndex: 'treant', difficulty: 'medium', goldReward: 50 }, // 138
        { type: 'normal', monsterIndex: 'gynosphinx', difficulty: 'medium', goldReward: 52 }, // 136 
        { type: 'normal', monsterIndex: 'shield-guardian', difficulty: 'medium', goldReward: 54 }, // 142
        { type: 'normal', monsterIndex: 'young-green-dragon', difficulty: 'medium', goldReward: 56 }, // 136
        { type: 'normal', monsterIndex: 'vampire-mist', difficulty: 'medium', goldReward: 56 }, // 144
        { type: 'normal', monsterIndex: 'shambling-mound', difficulty: 'medium', goldReward: 56 }, // 136
        {
          type: 'mini-boss',
          monsterIndex: '', // 172
          difficulty: 'boss-strong',
          firstGoldReward: 970,
          goldReward: 75,
        },
      ],
      unlocks: 'hunt19',
    },
    {
      id: 19,
      key: 'hunt19',
      name: '',
      description: ``,
      energyCost: 2,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'vampire-spawn', difficulty: 'very-hard', goldReward: 75 }, // 164
        { type: 'normal', monsterIndex: 'ettin', difficulty: 'very-hard', goldReward: 77 }, // 127
        { type: 'normal', monsterIndex: 'ogre-zombie', difficulty: 'very-hard', goldReward: 79 }, // 170
        { type: 'normal', monsterIndex: 'air-elemental', difficulty: 'very-hard', goldReward: 81 }, // 135
        { type: 'normal', monsterIndex: 'spirit-naga', difficulty: 'very-hard', goldReward: 83 }, // 105
        { type: 'normal', monsterIndex: 'troll', difficulty: 'very-hard', goldReward: 85 }, // 168
        { type: 'normal', monsterIndex: 'green-hag', difficulty: 'very-hard', goldReward: 87 }, // 164
        { type: 'normal', monsterIndex: 'lamia', difficulty: 'very-hard', goldReward: 89 }, // 194
        { type: 'normal', monsterIndex: 'hill-giant', difficulty: 'very-hard', goldReward: 91 }, // 210
        {
          type: 'boss',
          monsterIndex: 'young-red-dragon', // 356
          difficulty: 'boss-strong',
          firstGoldReward: 2253,
          goldReward: 93,
        },
      ],
      unlocksPage: 'page3',
    },
  ],
}
