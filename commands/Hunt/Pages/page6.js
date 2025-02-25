module.exports = {
  key: 'page6',
  name: `Hunt Page 6 - Sanity Check`,
  description: 'Stop the insane Solar.',
  finalBoss: 'Solar',
  hunts: [
    {
      id: 30,
      key: 'hunt30',
      name: 'Druid',
      description: `The druid rises up against you to protect the Solar.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'specter', difficulty: 702, goldReward: 176 }, // 702
        { type: 'normal', monsterIndex: 'skeleton', difficulty: 709, goldReward: 178 }, // 709
        { type: 'normal', monsterIndex: 'hezrou', difficulty: 700, goldReward: 180 }, // 700
        { type: 'normal', monsterIndex: 'ankheg', difficulty: 705, goldReward: 183 }, // 705
        { type: 'normal', monsterIndex: 'duergar', difficulty: 706, goldReward: 185 }, // 706
        { type: 'normal', monsterIndex: 'spy', difficulty: 704, goldReward: 177 }, // 704
        { type: 'normal', monsterIndex: 'hell-hound', difficulty: 701, goldReward: 179 }, // 701
        { type: 'normal', monsterIndex: 'centaur', difficulty: 707, goldReward: 182 }, // 707
        { type: 'normal', monsterIndex: 'bearded-devil', difficulty: 710, goldReward: 184 }, // 710
        {
          type: 'mini-boss',
          monsterIndex: 'druid', 
          difficulty: '709',
          firstGoldReward: 218,
          goldReward: 186,
        },
      ],
      unlocks: 'hunt31',
    },
    {
      id: 31,
      key: 'hunt31',
      name: `Unicorn`,
      description: `The corruption spreads to the unicorn.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'guard', difficulty: 717, goldReward: 178 }, // 717
        { type: 'normal', monsterIndex: 'bone-devil', difficulty: 706, goldReward: 180 }, // 706
        { type: 'normal', monsterIndex: 'wraith', difficulty: 714, goldReward: 183 }, // 714
        { type: 'normal', monsterIndex: 'salamander', difficulty: 715, goldReward: 185 }, // 715
        { type: 'normal', monsterIndex: 'scout', difficulty: 713, goldReward: 188 }, // 713
        { type: 'normal', monsterIndex: 'chain-devil', difficulty: 720, goldReward: 179 }, // 720
        { type: 'normal', monsterIndex: 'goblin', difficulty: 707, goldReward: 182 }, // 707
        { type: 'normal', monsterIndex: 'wight', difficulty: 705, goldReward: 184 }, // 705
        { type: 'normal', monsterIndex: 'cockatrice', difficulty: 709, goldReward: 186 }, // 709
        {
          type: 'mini-boss',
          monsterIndex: 'unicorn', 
          difficulty: '720',
          firstGoldReward: 222,
          goldReward: 189,
        },
      ],
      unlocks: 'hunt32',
    },
    {
      id: 32,
      key: 'hunt32',
      name: 'Planetar',
      description: `It worsens as the armies of heaven rise up against you.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'zombie', difficulty: 730, goldReward: 180 }, // 730
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 732, goldReward: 195 }, // 732
        { type: 'normal', monsterIndex: 'couatl', difficulty: 726, goldReward: 185 }, // 726
        { type: 'normal', monsterIndex: 'dretch', difficulty: 728, goldReward: 188 }, // 728
        { type: 'normal', monsterIndex: 'xorn', difficulty: 734, goldReward: 190 }, // 734
        { type: 'normal', monsterIndex: 'behir', difficulty: 727, goldReward: 181 }, // 727
        { type: 'normal', monsterIndex: 'gnoll', difficulty: 736, goldReward: 184 }, // 736
        { type: 'normal', monsterIndex: 'tribal-warrior', difficulty: 725, goldReward: 186 }, // 725
        { type: 'normal', monsterIndex: 'imp', difficulty: 721, goldReward: 189 }, // 721
        {
          type: 'mini-boss',
          monsterIndex: 'planetar', 
          difficulty: '740',
          firstGoldReward: 275,
          goldReward: 191,
        },
      ],
      unlocks: 'hunt33',
    },
    {
      id: 33,
      key: 'hunt33',
      name: 'Half Dragon',
      description: `Mortals and celestials alike want you dead.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'priest', difficulty: 765, goldReward: 194 }, // 765
        { type: 'normal', monsterIndex: 'ice-devil', difficulty: 763, goldReward: 196 }, // 763
        { type: 'normal', monsterIndex: 'invisible-stalker', difficulty: 771, goldReward: 198 }, // 771
        { type: 'normal', monsterIndex: 'death-dog', difficulty: 787, goldReward: 201 }, // 787
        { type: 'normal', monsterIndex: 'ghoul', difficulty: 757, goldReward: 203 }, // 757
        { type: 'normal', monsterIndex: 'orc', difficulty: 747, goldReward: 206 }, // 747
        { type: 'normal', monsterIndex: 'marilith', difficulty: 778, goldReward: 208 }, // 778
        { type: 'normal', monsterIndex: 'erinyes', difficulty: 782, goldReward: 210 }, // 782
        { type: 'normal', monsterIndex: 'sahuagin', difficulty: 790, goldReward: 213 }, // 790
        {
          type: 'mini-boss',
          monsterIndex: 'half-red-dragon-veteran', 
          difficulty: '800',
          firstGoldReward: 280,
          goldReward: 215,
        },
      ],
      unlocks: 'hunt34',
    },
    {
      id: 34,
      key: 'hunt34',
      name: 'Mummy Lord',
      description: `The Solar has unleashed a curse of undeath.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'ghast', difficulty: 792, goldReward: 194 }, // 792
        { type: 'normal', monsterIndex: 'lemure', difficulty: 797, goldReward: 196 }, // 797
        { type: 'normal', monsterIndex: 'noble', difficulty: 814, goldReward: 198 }, // 814
        { type: 'normal', monsterIndex: 'azer', difficulty: 813, goldReward: 201 }, // 813
        { type: 'normal', monsterIndex: 'pegasus', difficulty: 811, goldReward: 203 }, // 811
        { type: 'normal', monsterIndex: 'efreeti', difficulty: 807, goldReward: 206 }, // 807
        { type: 'normal', monsterIndex: 'androsphinx', difficulty: 810, goldReward: 208 }, // 810
        { type: 'normal', monsterIndex: 'mage', difficulty: 799, goldReward: 210 }, // 799
        { type: 'normal', monsterIndex: 'shadow', difficulty: 812, goldReward: 213 }, // 812
        {
          type: 'mini-boss',
          monsterIndex: 'mummy-lord', 
          difficulty: '815',
          firstGoldReward: 280,
          goldReward: 215,
        },
      ],
      unlocks: 'hunt35',
    },
    {
      id: 35,
      key: 'hunt35',
      name: 'Treant',
      description: `You're getting close, but even fey are not immune.`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'black-pudding', difficulty: 821, goldReward: 194 }, // 821
        { type: 'normal', monsterIndex: 'night-hag', difficulty: 884, goldReward: 196 }, // 884
        { type: 'normal', monsterIndex: 'gargoyle', difficulty: 881, goldReward: 198 }, // 881
        { type: 'normal', monsterIndex: 'basilisk', difficulty: 866, goldReward: 201 }, // 866
        { type: 'normal', monsterIndex: 'merfolk', difficulty: 848, goldReward: 203 }, // 848
        { type: 'normal', monsterIndex: 'gray-ooze', difficulty: 842, goldReward: 206 }, // 842
        { type: 'normal', monsterIndex: 'lemure', difficulty: 838, goldReward: 208 }, // 838
        { type: 'normal', monsterIndex: 'steam-mephit', difficulty: 876, goldReward: 210 }, // 876
        { type: 'normal', monsterIndex: 'lizardfolk', difficulty: 841, goldReward: 213 }, // 841
        {
          type: 'mini-boss',
          monsterIndex: 'treant', 
          difficulty: '890',
          firstGoldReward: 292,
          goldReward: 218,
        },
      ],
      unlocks: 'hunt36',
    },
    {
      id: 36,
      key: 'hunt36',
      name: 'Solar',
      description: `Finally, you must end this. Set the Solar free!`,
      energyCost: 3,
      totalBattles: 10,
      battles: [
        { type: 'normal', monsterIndex: 'hobgoblin', difficulty: 905, goldReward: 196 }, // 905
        { type: 'normal', monsterIndex: 'water-elemental', difficulty: 889, goldReward: 198 }, // 889
        { type: 'normal', monsterIndex: 'bandit', difficulty: 894, goldReward: 201 }, // 894
        { type: 'normal', monsterIndex: 'assassin', difficulty: 918, goldReward: 203 }, // 918
        { type: 'normal', monsterIndex: 'quasit', difficulty: 916, goldReward: 206 }, // 916
        { type: 'normal', monsterIndex: 'kobold', difficulty: 909, goldReward: 208 }, // 909
        { type: 'normal', monsterIndex: 'guardian-naga', difficulty: 895, goldReward: 210 }, // 895
        { type: 'normal', monsterIndex: 'ochre-jelly', difficulty: 885, goldReward: 213 }, // 885
        { type: 'normal', monsterIndex: 'archmage', difficulty: 924, goldReward: 215 }, // 924
        {
          type: 'boss',
          monsterIndex: 'solar', 
          difficulty: '929',
          firstGoldReward: 4304,
          goldReward: 220,
        },
      ],
      unlocksPage: 'finished',
    },
  ],
}
