module.exports = {
  key: 'page3',
  name: `Hunt Page 3 - A Dragon's Revenge`,
  description:
    'Oryzinax was only the beginning. His brood spread across the land. The young dragon mage Drokkenden continues the terror.',
  finalBoss: 'young-red-dragon',
  hunts: [
    {
      id: 13,
      key: 'hunt13',
      name: 'Hobrich the Vexed',
      description: `Drokkenden's enchantment have overcome the black dragon, Hobrich, turning his fierce foe into a puppet.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'remorhaz', difficulty: 'medium', goldReward: 63 }, // 195
        { type: 'normal', monsterIndex: 'androsphinx', difficulty: 'medium', goldReward: 65 }, // 199
        { type: 'normal', monsterIndex: 'planetar', difficulty: 'medium', goldReward: 67 }, // 200
        { type: 'normal', monsterIndex: 'marilith', difficulty: 'medium', goldReward: 69 }, // 189
        { type: 'normal', monsterIndex: 'lich', difficulty: 'hard', goldReward: 71 }, // 202
        { type: 'normal', monsterIndex: 'young-blue-dragon', difficulty: 'hard', goldReward: 64 }, // 228
        { type: 'normal', monsterIndex: 'werebear-hybrid', difficulty: 'hard', goldReward: 66 }, // 202
        { type: 'normal', monsterIndex: 'wyvern', difficulty: 'very-hard', goldReward: 68 }, // 220
        { type: 'normal', monsterIndex: 'behir', difficulty: 'medium', goldReward: 70 }, // 165
        {
          type: 'mini-boss',
          monsterIndex: 'young-black-dragon', // 254
          difficulty: 'boss-epic',
          firstGoldReward: 98,
          goldReward: 72,
        },
      ],
      unlocks: 'hunt14',
    },
    {
      id: 14,
      key: 'hunt14',
      name: `Hydra`,
      description: `A dragon wasn't enough, Drokkenden now summons a vicious hydra from the depths of the sea.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'ghost', difficulty: 'legend', goldReward: 65 }, // 225
        { type: 'normal', monsterIndex: 'wight', difficulty: 'legend', goldReward: 67 }, // 225
        { type: 'normal', monsterIndex: 'satyr', difficulty: 'legend', goldReward: 69 }, // 155
        { type: 'normal', monsterIndex: 'hell-hound', difficulty: 'legend', goldReward: 71 }, // 225
        { type: 'normal', monsterIndex: 'harpy', difficulty: 'legend', goldReward: 73 }, // 190
        { type: 'normal', monsterIndex: 'animated-armor', difficulty: 'legend', goldReward: 66 }, // 165
        { type: 'normal', monsterIndex: 'centaur', difficulty: 'legend', goldReward: 68 }, // 225
        { type: 'normal', monsterIndex: 'ettercap', difficulty: 'legend', goldReward: 70 }, // 220
        { type: 'normal', monsterIndex: 'ghast', difficulty: 'legend', goldReward: 72 }, // 185
        {
          type: 'mini-boss',
          monsterIndex: 'hydra', // 258
          difficulty: 'boss-strong',
          firstGoldReward: 102,
          goldReward: 74,
        },
      ],
      unlocks: 'hunt15',
    },
    {
      id: 15,
      key: 'hunt15',
      name: 'Mummy',
      description: `Drokkenden has noticed your meddling. He has sent an army of cursed souls to stop you.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'rhinoceros', difficulty: 'legend', goldReward: 67 }, // 225
        { type: 'normal', monsterIndex: 'earth-elemental', difficulty: 'hard', goldReward: 79 }, // 189
        { type: 'normal', monsterIndex: 'drider', difficulty: 'hard', goldReward: 71 }, // 184
        { type: 'normal', monsterIndex: 'fire-giant', difficulty: 'hard', goldReward: 73 }, // 243
        { type: 'normal', monsterIndex: 'balor', difficulty: 'medium', goldReward: 75 }, // 262
        { type: 'normal', monsterIndex: 'vampire-bat', difficulty: 'hard', goldReward: 680 }, // 216
        { type: 'normal', monsterIndex: 'giant-ape', difficulty: 'hard', goldReward: 70 }, // 186
        { type: 'normal', monsterIndex: 'gladiator', difficulty: 'very-hard', goldReward: 72 }, // 224
        { type: 'normal', monsterIndex: 'mammoth', difficulty: 'very-hard', goldReward: 74 }, // 252
        {
          type: 'mini-boss',
          monsterIndex: 'mummy', // 290
          difficulty: 'boss-legend',
          firstGoldReward: 146,
          goldReward: 76,
        },
      ],
      unlocks: 'hunt16',
    },
    {
      id: 16,
      key: 'hunt16',
      name: 'Erinyes',
      description:
        'The deva you once saved has fallen and now serves the dragons. Stop her before she opens the gates to hell.',
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'shambling-mound', difficulty: 'very-hard', goldReward: 105 }, // 272
        { type: 'normal', monsterIndex: 'otyugh', difficulty: 'very-hard', goldReward: 108 }, // 228
        { type: 'normal', monsterIndex: 'shield-guardian', difficulty: 'very-hard', goldReward: 111 }, // 284
        { type: 'normal', monsterIndex: 'stone-golem', difficulty: 'hard', goldReward: 114 }, // 267
        { type: 'normal', monsterIndex: 'djinni', difficulty: 'hard', goldReward: 117 }, // 241
        { type: 'normal', monsterIndex: 'gargoyle', difficulty: 'legend', goldReward: 120 }, // 260
        { type: 'normal', monsterIndex: 'water-elemental', difficulty: 'very-hard', goldReward: 123 }, // 228
        { type: 'normal', monsterIndex: 'young-gold-dragon', difficulty: 'hard', goldReward: 145 }, // 267
        { type: 'normal', monsterIndex: 'lich', difficulty: 'very-hard', goldReward: 149 }, // 270
        {
          type: 'mini-boss',
          monsterIndex: 'erinyes', // 306
          difficulty: 'boss-epic',
          firstGoldReward: 294,
          goldReward: 92,
        },
      ],
      unlocks: 'hunt17',
    },
    {
      id: 17,
      key: 'hunt17',
      name: 'Ice Devil',
      description:
        `You stopped her, but were too late. Devils crossed over and sew chaos at Drokkenden's hand.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'nalfeshnee', difficulty: 'hard', goldReward: 83 }, // 276
        { type: 'normal', monsterIndex: 'storm-giant', difficulty: 'medium', goldReward: 85 }, // 230
        { type: 'normal', monsterIndex: 'roc', difficulty: 'medium', goldReward: 87 }, // 248
        { type: 'normal', monsterIndex: 'giant-boar', difficulty: 'legend', goldReward: 89 }, // 210
        { type: 'normal', monsterIndex: 'knight', difficulty: 'legend', goldReward: 91 }, // 260 
        { type: 'normal', monsterIndex: 'mage', difficulty: 'legend', goldReward: 84 }, // 200 
        { type: 'normal', monsterIndex: 'giant-constrictor-snake', difficulty: 'legend', goldReward: 86 }, // 300
        { type: 'normal', monsterIndex: 'triceratops', difficulty: 'epic', goldReward: 88 }, // 285
        { type: 'normal', monsterIndex: 'basilisk', difficulty: 'legend', goldReward: 90 }, // 260
        {
          type: 'mini-boss',
          monsterIndex: 'ice-devil', // 270
          difficulty: 'boss-strong',
          firstGoldReward: 188,
          goldReward: 60,
        },
      ],
      unlocks: 'hunt18',
    },
    {
      id: 18,
      key: 'hunt18',
      name: 'Glabrezu',
      description:
        `The last demon general is all that stands between you and your mortal enemy.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'doppleganger', difficulty: 'legend', goldReward: 85 }, // 260
        { type: 'normal', monsterIndex: 'gargoyle', difficulty: 'legend', goldReward: 87 }, // 250
        { type: 'normal', monsterIndex: 'archmage', difficulty: 'epic', goldReward: 89 }, // 300 
        { type: 'normal', monsterIndex: 'griffon', difficulty: 'legend', goldReward: 91 }, // 295
        { type: 'normal', monsterIndex: 'solar', difficulty: 'medium', goldReward: 93 }, // 243
        { type: 'normal', monsterIndex: 'hydra', difficulty: 'hard', goldReward: 86 }, // 258
        { type: 'normal', monsterIndex: 'mimic', difficulty: 'legend', goldReward: 88 }, // 290
        { type: 'normal', monsterIndex: 'assassin', difficulty: 'epic', goldReward: 90 }, // 234
        { type: 'normal', monsterIndex: 'balor', difficulty: 'medium', goldReward: 92 }, // 262 
        {
          type: 'mini-boss',
          monsterIndex: 'glabrezu', // 314
          difficulty: 'boss-epic',
          firstGoldReward: 188,
          goldReward: 95,
        },
      ],
      unlocks: 'hunt19',
    },
    {
      id: 19,
      key: 'hunt19',
      name: 'Drokkenden the Dread',
      description: `At the top of Mount Dread, you face Drokkenden dread, the lava-breathing dragon who pulls the strings behind this destruction.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'unicorn', difficulty: 'legend', goldReward: 135 }, // 335
        { type: 'normal', monsterIndex: 'owlbear', difficulty: 'legend', goldReward: 138 }, // 295
        { type: 'normal', monsterIndex: 'succubus-incubus', difficulty: 'legend', goldReward: 141 }, // 330
        { type: 'normal', monsterIndex: 'mummy-lord', difficulty: 'epic', goldReward: 144 }, // 285
        { type: 'normal', monsterIndex: 'wraith', difficulty: 'legend', goldReward: 147 }, // 335
        { type: 'normal', monsterIndex: 'cloud-giant', difficulty: 'very-hard', goldReward: 150 }, // 350
        { type: 'normal', monsterIndex: 'hill-giant', difficulty: 'epic', goldReward: 153 }, // 315
        { type: 'normal', monsterIndex: 'otyugh', difficulty: 'epic', goldReward: 106 }, // 342
        { type: 'normal', monsterIndex: 'minotaur-skeleton', difficulty: 'legend', goldReward: 105 }, // 335
        {
          type: 'boss',
          monsterIndex: 'young-red-dragon', // 356
          difficulty: 'boss-epic',
          firstGoldReward: 294,
          goldReward: 110,
        },
      ],
      unlocksPage: 'finished',
    },
  ],
}
