module.exports = {
  key: 'page4',
  name: `Hunt Page 4 - Road to Hell`,
  description:
    `The battle against Drokkenden left hell's gates open and a demonic new threat has found its way from the abyss.`,
  finalBoss: 'Rakshasa',
  hunts: [
    {
      id: 20,
      key: 'hunt20',
      name: 'Purple Worm',
      description: `An entire town vanished thanks to the hungry terror beneath its sewers.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'winter-wolf', difficulty: '5', goldReward: 104 }, // 375
        { type: 'normal', monsterIndex: 'elephant', difficulty: '5', goldReward: 106 }, // 380
        { type: 'normal', monsterIndex: 'troll', difficulty: '5', goldReward: 108 }, // 420
        { type: 'normal', monsterIndex: 'spirit-naga', difficulty: '5', goldReward: 110 }, // 375
        { type: 'normal', monsterIndex: 'black-pudding', difficulty: '5', goldReward: 112 }, // 425
        { type: 'normal', monsterIndex: 'ogre-zombie', difficulty: '5', goldReward: 114 }, // 425
        { type: 'normal', monsterIndex: 'gelatinous-cube', difficulty: '5', goldReward: 116 }, // 420
        { type: 'normal', monsterIndex: 'minotaur', difficulty: '5', goldReward: 105 }, // 380
        { type: 'normal', monsterIndex: 'giant-crocodile', difficulty: '5', goldReward: 107 }, // 425
        {
          type: 'mini-boss',
          monsterIndex: 'purple-worm', // 494
          difficulty: 2,
          firstGoldReward: 228,
          goldReward: 109,
        },
      ],
      unlocks: 'hunt21',
    },
    {
      id: 21,
      key: 'hunt21',
      name: `Duergar`,
      description: `The demon has corrupted the Duergar, turning them into twisted protectors of its dark rituals.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'lizardfolk', difficulty: '6', goldReward: 107 }, // 440
        { type: 'normal', monsterIndex: 'treant', difficulty: '3', goldReward: 109 }, // 414
        { type: 'normal', monsterIndex: 'young-white-dragon', difficulty: '3', goldReward: 110 }, // 399
        { type: 'normal', monsterIndex: 'gray-ooze', difficulty: '5', goldReward: 113 }, // 440
        { type: 'normal', monsterIndex: 'hezrou', difficulty: '3', goldReward: 106 }, // 408
        { type: 'normal', monsterIndex: 'giant-shark', difficulty: '3', goldReward: 108 }, // 375
        { type: 'normal', monsterIndex: 'clay-golem', difficulty: '3', goldReward: 110 }, // 399
        { type: 'normal', monsterIndex: 'specter', difficulty: '5', goldReward: 112 }, // 440
        { type: 'normal', monsterIndex: 'stone-giant', difficulty: '3', goldReward: 107 }, // 378
        {
          type: 'mini-boss',
          monsterIndex: 'duergar', // 520
          difficulty: 20,
          firstGoldReward: 220,
          goldReward: 109,
        },
      ],
      unlocks: 'hunt22',
    },
    {
      id: 22,
      key: 'hunt22',
      name: 'Fire Elemental',
      description: `This polluted wildfire will consume everyone and everything unless it's stopped.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'gnoll', difficulty: '20', goldReward: 109 }, // 225
        { type: 'normal', monsterIndex: 'giant-crocodile', difficulty: '5', goldReward: 111 }, // 189
        { type: 'normal', monsterIndex: 'ice-mephit', difficulty: '20', goldReward: 113 }, // 184
        { type: 'normal', monsterIndex: 'ettin', difficulty: '5', goldReward: 115 }, // 243
        { type: 'normal', monsterIndex: 'bulette', difficulty: '5', goldReward: 117 }, // 262
        { type: 'normal', monsterIndex: 'steam-mephit', difficulty: '20', goldReward: 108 }, // 216
        { type: 'normal', monsterIndex: 'will-o-wisp', difficulty: '20', goldReward: 110 }, // 186
        { type: 'normal', monsterIndex: 'magma-mephit', difficulty: '20', goldReward: 112 }, // 224
        { type: 'normal', monsterIndex: 'triceratops', difficulty: '5', goldReward: 114 }, // 252
        {
          type: 'mini-boss',
          monsterIndex: 'fire-elemental', // 510
          difficulty: 5,
          firstGoldReward: 226,
          goldReward: 76,
        },
      ],
      unlocks: 'hunt23',
    },
    {
      id: 23,
      key: 'hunt23',
      name: 'Balor',
      description:
        `Finally! We've found the balor behind this terror all along... right?`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'chain-devil', difficulty: '5', goldReward: 116 }, // 272
        { type: 'normal', monsterIndex: 'zombie', difficulty: '20', goldReward: 118 }, // 228
        { type: 'normal', monsterIndex: 'frost-giant', difficulty: '3', goldReward: 120 }, // 284
        { type: 'normal', monsterIndex: 'flesh-golem', difficulty: '5', goldReward: 111 }, // 267
        { type: 'normal', monsterIndex: 'salamander', difficulty: '5', goldReward: 165 }, // 241
        { type: 'normal', monsterIndex: 'magmin', difficulty: '50', goldReward: 168 }, // 260
        { type: 'normal', monsterIndex: 'tyrannosaurus-rex', difficulty: '3', goldReward: 171 }, // 228
        { type: 'normal', monsterIndex: 'young-bronze-dragon', difficulty: '3', goldReward: 174 }, // 267
        { type: 'normal', monsterIndex: 'air-elemental', difficulty: '5', goldReward: 180 }, // 270
        {
          type: 'mini-boss',
          monsterIndex: 'balor', // 524
          difficulty: 3,
          firstGoldReward: 410,
          goldReward: 183,
        },
      ],
      unlocks: 'hunt24',
    },
    {
      id: 24,
      key: 'hunt24',
      name: 'Priest',
      description:
        `Even with the Balor defeated, evil priests speak of the hushed one's return.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'giant-weasel', difficulty: '50', goldReward: 123 }, // 276
        { type: 'normal', monsterIndex: 'archmage', difficulty: '5', goldReward: 125 }, // 230
        { type: 'normal', monsterIndex: 'werebear-hybrid', difficulty: '3', goldReward: 127 }, // 248
        { type: 'normal', monsterIndex: 'bugbear', difficulty: '20', goldReward: 129 }, // 210
        { type: 'normal', monsterIndex: 'imp', difficulty: '50', goldReward: 131 }, // 260 
        { type: 'normal', monsterIndex: 'noble', difficulty: '50', goldReward: 133 }, // 200 
        { type: 'normal', monsterIndex: 'mummy-lord', difficulty: '5', goldReward: 135 }, // 300
        { type: 'normal', monsterIndex: 'invisible-stalker', difficulty: '4.7', goldReward: 137 }, // 285
        { type: 'normal', monsterIndex: 'knight', difficulty: '10', goldReward: 139 }, // 260
        {
          type: 'mini-boss',
          monsterIndex: 'priest', // 540
          difficulty: 20,
          firstGoldReward: 354,
          goldReward: 60,
        },
      ],
      unlocks: 'hunt25',
    },
    {
      id: 25,
      key: 'hunt25',
      name: 'Giant Spider',
      description:
        `This web of lies will come undone. Even with the fiendish spider guarding its secrets.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'lamia', difficulty: '5', goldReward: 141 }, // 260
        { type: 'normal', monsterIndex: 'violet-fungus', difficulty: '26', goldReward: 143 }, // 250
        { type: 'normal', monsterIndex: 'zombie', difficulty: '22', goldReward: 145 }, // 300 
        { type: 'normal', monsterIndex: 'shrieker', difficulty: '38', goldReward: 124 }, // 295
        { type: 'normal', monsterIndex: 'couatl', difficulty: '5', goldReward: 126 }, // 243
        { type: 'normal', monsterIndex: 'orc', difficulty: '34', goldReward: 128 }, // 258
        { type: 'normal', monsterIndex: 'shadow', difficulty: '31', goldReward: 130 }, // 290
        { type: 'normal', monsterIndex: 'satyr', difficulty: '16', goldReward: 132 }, // 234
        { type: 'normal', monsterIndex: 'rug-of-smothering', difficulty: '15', goldReward: 134 }, // 262 
        {
          type: 'mini-boss',
          monsterIndex: 'giant-spider', // 520
          difficulty: 20,
          firstGoldReward: 372,
          goldReward: 95,
        },
      ],
      unlocks: 'hunt26',
    },
    {
      id: 26,
      key: 'hunt26',
      name: 'Rakshasa',
      description: `At the heart of chaos stands the Rakshasa. His mechinations end here and now.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'lion', difficulty: '5', goldReward: 141 }, // 335
        { type: 'normal', monsterIndex: 'gladiator', difficulty: '5', goldReward: 143 }, // 295
        { type: 'normal', monsterIndex: 'vrock', difficulty: '5', goldReward: 145 }, // 330
        { type: 'normal', monsterIndex: 'hippogriff', difficulty: '38', goldReward: 147 }, // 285
        { type: 'normal', monsterIndex: 'grick', difficulty: '20', goldReward: 149 }, // 335
        { type: 'normal', monsterIndex: 'axe-beak', difficulty: '28', goldReward: 151 }, // 350
        { type: 'normal', monsterIndex: 'worg', difficulty: '20', goldReward: 153 }, // 315
        { type: 'normal', monsterIndex: 'hill-giant', difficulty: '5', goldReward: 155 }, // 342
        { type: 'normal', monsterIndex: 'dryad', difficulty: '23', goldReward: 157 }, // 335
        {
          type: 'boss',
          monsterIndex: 'rakshasa', // 550
          difficulty: 5,
          firstGoldReward: 312,
          goldReward: 462,
        },
      ],
      unlocksPage: 'finished',
    },
  ],
}
