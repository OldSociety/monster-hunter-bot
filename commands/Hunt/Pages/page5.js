module.exports = {
  key: 'page5',
  name: `Hunt Page 5 - Road to Hell`,
  description:
    `The battle against Drokkenden left hell's gates open and a demonic new threat has found its way from the abyss.`,
  finalBoss: 'Rakshasa',
  hunts: [
    {
      id: 23,
      key: 'hunt23',
      name: 'Purple Worm',
      description: `An entire town vanished thanks to the hungry terror beneath its sewers.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'winter-wolf', difficulty: 375, goldReward: 104 }, // 375
        { type: 'normal', monsterIndex: 'elephant', difficulty: 380, goldReward: 106 }, // 380
        { type: 'normal', monsterIndex: 'troll', difficulty: 420, goldReward: 108 }, // 420
        { type: 'normal', monsterIndex: 'spirit-naga', difficulty: 375, goldReward: 110 }, // 375
        { type: 'normal', monsterIndex: 'black-pudding', difficulty: 425, goldReward: 112 }, // 425
        { type: 'normal', monsterIndex: 'ogre-zombie', difficulty: 425, goldReward: 114 }, // 425
        { type: 'normal', monsterIndex: 'gelatinous-cube', difficulty: 420, goldReward: 116 }, // 420
        { type: 'normal', monsterIndex: 'minotaur', difficulty: 380, goldReward: 105 }, // 380
        { type: 'normal', monsterIndex: 'giant-crocodile', difficulty: 425, goldReward: 107 }, // 425
        {
          type: 'mini-boss',
          monsterIndex: 'purple-worm', // 494
          difficulty: 494,
          firstGoldReward: 428,
          goldReward: 109,
        },
      ],
      unlocks: 'hunt24',
    },
    {
      id: 24,
      key: 'hunt24',
      name: `Duergar`,
      description: `The demon has corrupted the Duergar, turning them into twisted protectors of its dark rituals.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'lizardfolk', difficulty: 440, goldReward: 107 }, // 440
        { type: 'normal', monsterIndex: 'treant', difficulty: 414, goldReward: 109 }, // 414
        { type: 'normal', monsterIndex: 'young-white-dragon', difficulty: 399, goldReward: 110 }, // 399
        { type: 'normal', monsterIndex: 'gray-ooze', difficulty: 440, goldReward: 113 }, // 440
        { type: 'normal', monsterIndex: 'hezrou', difficulty: 308, goldReward: 106 }, // 408
        { type: 'normal', monsterIndex: 'giant-shark', difficulty: 375, goldReward: 108 }, // 375
        { type: 'normal', monsterIndex: 'clay-golem', difficulty: 399, goldReward: 110 }, // 399
        { type: 'normal', monsterIndex: 'specter', difficulty: 440, goldReward: 112 }, // 440
        { type: 'normal', monsterIndex: 'stone-giant', difficulty: 378, goldReward: 107 }, // 378
        {
          type: 'mini-boss',
          monsterIndex: 'duergar', // 520
          difficulty: 520,
          firstGoldReward: 520,
          goldReward: 109,
        },
      ],
      unlocks: 'hunt25',
    },
    {
      id: 25,
      key: 'hunt25',
      name: 'Fire Elemental',
      description: `This polluted wildfire will consume everyone and everything unless it's stopped.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'gnoll', difficulty: 440, goldReward: 109 }, // 225
        { type: 'normal', monsterIndex: 'giant-crocodile', difficulty: 425, goldReward: 111 }, // 189
        { type: 'normal', monsterIndex: 'ice-mephit', difficulty: 420, goldReward: 113 }, // 184
        { type: 'normal', monsterIndex: 'ettin', difficulty: 437, goldReward: 115 }, // 243
        { type: 'normal', monsterIndex: 'bulette', difficulty: 470, goldReward: 117 }, // 262
        { type: 'normal', monsterIndex: 'steam-mephit', difficulty: 451, goldReward: 108 }, // 216
        { type: 'normal', monsterIndex: 'will-o-wisp', difficulty: 475, goldReward: 110 }, // 186
        { type: 'normal', monsterIndex: 'magma-mephit', difficulty: 467, goldReward: 112 }, // 224
        { type: 'normal', monsterIndex: 'triceratops', difficulty: 472, goldReward: 114 }, // 252
        {
          type: 'mini-boss',
          monsterIndex: 'fire-elemental', // 510
          difficulty: 510,
          firstGoldReward: 526,
          goldReward: 76,
        },
      ],
      unlocks: 'hunt26',
    },
    {
      id: 26,
      key: 'hunt26',
      name: 'Balor',
      description:
        `Finally! We've found the balor behind this terror all along... right?`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'chain-devil', difficulty: 423, goldReward: 116 }, // 272
        { type: 'normal', monsterIndex: 'zombie', difficulty: 441, goldReward: 118 }, // 228
        { type: 'normal', monsterIndex: 'frost-giant', difficulty: 414, goldReward: 120 }, // 284
        { type: 'normal', monsterIndex: 'flesh-golem', difficulty: 470, goldReward: 111 }, // 267
        { type: 'normal', monsterIndex: 'salamander', difficulty: 456, goldReward: 165 }, // 241
        { type: 'normal', monsterIndex: 'magmin', difficulty: 454, goldReward: 168 }, // 260
        { type: 'normal', monsterIndex: 'tyrannosaurus-rex', difficulty: 425, goldReward: 171 }, // 228
        { type: 'normal', monsterIndex: 'young-bronze-dragon', difficulty: 436, goldReward: 174 }, // 267
        { type: 'normal', monsterIndex: 'air-elemental', difficulty: 487, goldReward: 180 }, // 270
        {
          type: 'mini-boss',
          monsterIndex: 'balor', // 524
          difficulty: 524,
          firstGoldReward: 610,
          goldReward: 183,
        },
      ],
      unlocks: 'hunt27',
    },
    {
      id: 27,
      key: 'hunt27',
      name: 'Priest',
      description:
        `Even with the Balor defeated, evil priests speak of the hushed one's return.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'giant-weasel', difficulty: 454, goldReward: 123 }, // 276
        { type: 'normal', monsterIndex: 'archmage', difficulty: 499, goldReward: 125 }, // 230
        { type: 'normal', monsterIndex: 'werebear-hybrid', difficulty: 472, goldReward: 127 }, // 248
        { type: 'normal', monsterIndex: 'bugbear', difficulty: 503, goldReward: 129 }, // 210
        { type: 'normal', monsterIndex: 'imp', difficulty: 537, goldReward: 131 }, // 260 
        { type: 'normal', monsterIndex: 'noble', difficulty: 487, goldReward: 133 }, // 200 
        { type: 'normal', monsterIndex: 'mummy-lord', difficulty: 507, goldReward: 135 }, // 300
        { type: 'normal', monsterIndex: 'invisible-stalker', difficulty: 514, goldReward: 137 }, // 285
        { type: 'normal', monsterIndex: 'knight', difficulty: 511, goldReward: 139 }, // 260
        {
          type: 'mini-boss',
          monsterIndex: 'priest', // 540
          difficulty: 520,
          firstGoldReward: 654,
          goldReward: 60,
        },
      ],
      unlocks: 'hunt28',
    },
    {
      id: 28,
      key: 'hunt28',
      name: 'Giant Spider',
      description:
        `This web of lies will come undone. Even with the fiendish spider guarding its secrets.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'lamia', difficulty: 485, goldReward: 141 }, // 260
        { type: 'normal', monsterIndex: 'violet-fungus', difficulty: 480, goldReward: 143 }, // 250
        { type: 'normal', monsterIndex: 'zombie', difficulty: 484, goldReward: 145 }, // 300 
        { type: 'normal', monsterIndex: 'shrieker', difficulty: 494, goldReward: 124 }, // 295
        { type: 'normal', monsterIndex: 'couatl', difficulty: 485, goldReward: 126 }, // 243
        { type: 'normal', monsterIndex: 'orc', difficulty: 510, goldReward: 128 }, // 258
        { type: 'normal', monsterIndex: 'shadow', difficulty: 526, goldReward: 130 }, // 290
        { type: 'normal', monsterIndex: 'satyr', difficulty: 532, goldReward: 132 }, // 234
        { type: 'normal', monsterIndex: 'rug-of-smothering', difficulty: 522, goldReward: 134 }, // 262 
        {
          type: 'mini-boss',
          monsterIndex: 'giant-spider', // 520
          difficulty: 541,
          firstGoldReward: 672,
          goldReward: 95,
        },
      ],
      unlocks: 'hunt29',
    },
    {
      id: 29,
      key: 'hunt29',
      name: 'Rakshasa',
      description: `At the heart of chaos stands the Rakshasa. His mechinations end here and now.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'lion', difficulty: 520, goldReward: 141 }, // 335
        { type: 'normal', monsterIndex: 'gladiator', difficulty: 534, goldReward: 143 }, // 295
        { type: 'normal', monsterIndex: 'vrock', difficulty: 534, goldReward: 145 }, // 330
        { type: 'normal', monsterIndex: 'hippogriff', difficulty: 528, goldReward: 147 }, // 285
        { type: 'normal', monsterIndex: 'grick', difficulty: 540, goldReward: 149 }, // 335
        { type: 'normal', monsterIndex: 'axe-beak', difficulty: 534, goldReward: 151 }, // 350
        { type: 'normal', monsterIndex: 'worg', difficulty: 532, goldReward: 153 }, // 315
        { type: 'normal', monsterIndex: 'hill-giant', difficulty: 520, goldReward: 155 }, // 342
        { type: 'normal', monsterIndex: 'dryad', difficulty: 525, goldReward: 157 }, // 335
        {
          type: 'boss',
          monsterIndex: 'rakshasa', // 550
          difficulty: 550,
          firstGoldReward: 3462,
          goldReward: 462,
        },
      ],
      unlocksPage: 'page6',
    },
  ],
}
