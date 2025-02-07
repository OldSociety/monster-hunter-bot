module.exports = {
  key: 'page4',
  name: `Hunt Page 4 - A Dragon's Revenge`,
  description:
    'Oryzinax was only the beginning. His brood spread across the land. The young dragon mage Drokkenden continues the terror.',
  finalBoss: 'young-red-dragon',
  hunts: [
    {
      id: 16,
      key: 'hunt16',
      name: 'Hobrich the Vexed',
      description: `Drokkenden’s enchantment has turned Hobrich, the black dragon, into a puppet of terror.`,
      energyCost: 2,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'remorhaz', difficulty: 1, goldReward: 63 }, // 195
        { type: 'normal', monsterIndex: 'androsphinx', difficulty: 1, goldReward: 65 }, // 199
        { type: 'normal', monsterIndex: 'planetar', difficulty: 1, goldReward: 67 }, // 200
        { type: 'normal', monsterIndex: 'marilith', difficulty: 1, goldReward: 69 }, // 189
        { type: 'normal', monsterIndex: 'lich', difficulty: 1.5, goldReward: 71 }, // 202
        { type: 'normal', monsterIndex: 'young-blue-dragon', difficulty: 1.5, goldReward: 64 }, // 228
        { type: 'normal', monsterIndex: 'werebear-hybrid', difficulty: 1.5, goldReward: 66 }, // 202
        { type: 'normal', monsterIndex: 'wyvern', difficulty: 2, goldReward: 68 }, // 220
        { type: 'normal', monsterIndex: 'behir', difficulty: 1, goldReward: 70 }, // 165
        {
          type: 'mini-boss',
          monsterIndex: 'young-black-dragon', // 254
          difficulty: 2,
          firstGoldReward: 98,
          goldReward: 72,
        },
      ],
      unlocks: 'hunt17',
    },
    {
      id: 17,
      key: 'hunt17',
      name: `Hydra`,
      description: `A dragon wasn't enough, Drokkenden now summons a vicious hydra from the depths of the sea.`,
      energyCost: 2,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'ghost', difficulty: 5, goldReward: 65 }, // 225
        { type: 'normal', monsterIndex: 'wight', difficulty: 5, goldReward: 67 }, // 225
        { type: 'normal', monsterIndex: 'satyr', difficulty: 5, goldReward: 69 }, // 155
        { type: 'normal', monsterIndex: 'hell-hound', difficulty: 5, goldReward: 71 }, // 225
        { type: 'normal', monsterIndex: 'harpy', difficulty: 5, goldReward: 73 }, // 190
        { type: 'normal', monsterIndex: 'animated-armor', difficulty: 5, goldReward: 66 }, // 165
        { type: 'normal', monsterIndex: 'centaur', difficulty: 5, goldReward: 68 }, // 225
        { type: 'normal', monsterIndex: 'ettercap', difficulty: 5, goldReward: 70 }, // 220
        { type: 'normal', monsterIndex: 'ghast', difficulty: 5, goldReward: 72 }, // 185
        {
          type: 'mini-boss',
          monsterIndex: 'hydra', // 258
          difficulty: 1.5,
          firstGoldReward: 102,
          goldReward: 74,
        },
      ],
      unlocks: 'hunt18',
    },
    {
      id: 18,
      key: 'hunt18',
      name: 'Mummy',
      description: `Drokkenden has noticed your work and sent an army of cursed souls to stop you.`,
      energyCost: 2,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'rhinoceros', difficulty: 5, goldReward: 67 }, // 225
        { type: 'normal', monsterIndex: 'earth-elemental', difficulty: 1.5, goldReward: 79 }, // 189
        { type: 'normal', monsterIndex: 'drider', difficulty: 1.5, goldReward: 71 }, // 184
        { type: 'normal', monsterIndex: 'fire-giant', difficulty: 1.5, goldReward: 73 }, // 243
        { type: 'normal', monsterIndex: 'balor', difficulty: 1, goldReward: 75 }, // 262
        { type: 'normal', monsterIndex: 'vampire-bat', difficulty: 1.5, goldReward: 680 }, // 216
        { type: 'normal', monsterIndex: 'giant-ape', difficulty: 1.5, goldReward: 70 }, // 186
        { type: 'normal', monsterIndex: 'gladiator', difficulty: 2, goldReward: 72 }, // 224
        { type: 'normal', monsterIndex: 'mammoth', difficulty: 2, goldReward: 74 }, // 252
        {
          type: 'mini-boss',
          monsterIndex: 'mummy', // 290
          difficulty: 5,
          firstGoldReward: 146,
          goldReward: 76,
        },
      ],
      unlocks: 'hunt19',
    },
    {
      id: 19,
      key: 'hunt19',
      name: 'Erinyes',
      description:
        'The deva fell and now serves Drokkenden—stop her before she opens the gates to hell.',
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'shambling-mound', difficulty: 2, goldReward: 105 }, // 272
        { type: 'normal', monsterIndex: 'otyugh', difficulty: 2, goldReward: 108 }, // 228
        { type: 'normal', monsterIndex: 'shield-guardian', difficulty: 2, goldReward: 111 }, // 284
        { type: 'normal', monsterIndex: 'stone-golem', difficulty: 1.5, goldReward: 114 }, // 267
        { type: 'normal', monsterIndex: 'djinni', difficulty: 1.5, goldReward: 117 }, // 241
        { type: 'normal', monsterIndex: 'gargoyle', difficulty: 5, goldReward: 120 }, // 260
        { type: 'normal', monsterIndex: 'water-elemental', difficulty: 2, goldReward: 123 }, // 228
        { type: 'normal', monsterIndex: 'young-gold-dragon', difficulty: 1.5, goldReward: 145 }, // 267
        { type: 'normal', monsterIndex: 'lich', difficulty: 2, goldReward: 149 }, // 270
        {
          type: 'mini-boss',
          monsterIndex: 'erinyes', // 306
          difficulty: 2,
          firstGoldReward: 294,
          goldReward: 92,
        },
      ],
      unlocks: 'hunt20',
    },
    {
      id: 20,
      key: 'hunt20',
      name: 'Ice Devil',
      description:
        `You stopped her, but were too late. Devils crossed over and sew chaos at Drokkenden's hand.`,
      energyCost: 2,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'nalfeshnee', difficulty: 1.5, goldReward: 83 }, // 276
        { type: 'normal', monsterIndex: 'storm-giant', difficulty: 1, goldReward: 85 }, // 230
        { type: 'normal', monsterIndex: 'roc', difficulty: 1, goldReward: 87 }, // 248
        { type: 'normal', monsterIndex: 'giant-boar', difficulty: 5, goldReward: 89 }, // 210
        { type: 'normal', monsterIndex: 'knight', difficulty: 5, goldReward: 91 }, // 260 
        { type: 'normal', monsterIndex: 'mage', difficulty: 5, goldReward: 84 }, // 200 
        { type: 'normal', monsterIndex: 'giant-constrictor-snake', difficulty: 5, goldReward: 86 }, // 300
        { type: 'normal', monsterIndex: 'triceratops', difficulty: 3, goldReward: 88 }, // 285
        { type: 'normal', monsterIndex: 'basilisk', difficulty: 5, goldReward: 90 }, // 260
        {
          type: 'mini-boss',
          monsterIndex: 'ice-devil', // 270
          difficulty: 1.5,
          firstGoldReward: 188,
          goldReward: 60,
        },
      ],
      unlocks: 'hunt21',
    },
    {
      id: 21,
      key: 'hunt21',
      name: 'Glabrezu',
      description:
        `The last demon general is all that stands between you and your mortal enemy.`,
      energyCost: 2,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'doppelganger', difficulty: 5, goldReward: 85 }, // 260
        { type: 'normal', monsterIndex: 'gargoyle', difficulty: 5, goldReward: 87 }, // 250
        { type: 'normal', monsterIndex: 'archmage', difficulty: 3, goldReward: 89 }, // 300 
        { type: 'normal', monsterIndex: 'griffon', difficulty: 5, goldReward: 91 }, // 295
        { type: 'normal', monsterIndex: 'solar', difficulty: 1, goldReward: 93 }, // 243
        { type: 'normal', monsterIndex: 'hydra', difficulty: 1.5, goldReward: 86 }, // 258
        { type: 'normal', monsterIndex: 'mimic', difficulty: 5, goldReward: 88 }, // 290
        { type: 'normal', monsterIndex: 'assassin', difficulty: 3, goldReward: 90 }, // 234
        { type: 'normal', monsterIndex: 'balor', difficulty: 1, goldReward: 92 }, // 262 
        {
          type: 'mini-boss',
          monsterIndex: 'glabrezu', // 314
          difficulty: 2,
          firstGoldReward: 188,
          goldReward: 95,
        },
      ],
      unlocks: 'hunt22',
    },
    {
      id: 22,
      key: 'hunt22',
      name: 'Drokkenden the Dread',
      description: `At the top of Mount Dread, you face Drokkenden the Dread, behind all this destruction.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'unicorn', difficulty: 5, goldReward: 135 }, // 335
        { type: 'normal', monsterIndex: 'owlbear', difficulty: 5, goldReward: 138 }, // 295
        { type: 'normal', monsterIndex: 'succubus-incubus', difficulty: 5, goldReward: 141 }, // 330
        { type: 'normal', monsterIndex: 'mummy-lord', difficulty: 3, goldReward: 144 }, // 285
        { type: 'normal', monsterIndex: 'wraith', difficulty: 5, goldReward: 147 }, // 335
        { type: 'normal', monsterIndex: 'cloud-giant', difficulty: 2, goldReward: 150 }, // 350
        { type: 'normal', monsterIndex: 'hill-giant', difficulty: 3, goldReward: 153 }, // 315
        { type: 'normal', monsterIndex: 'otyugh', difficulty: 3, goldReward: 106 }, // 342
        { type: 'normal', monsterIndex: 'minotaur-skeleton', difficulty: 5, goldReward: 105 }, // 335
        {
          type: 'boss',
          monsterIndex: 'young-red-dragon', // 356
          difficulty: 3,
          firstGoldReward: 256,
          goldReward: 110,
        },
      ],
      unlocksPage: 'page5',
    },
  ],
}
