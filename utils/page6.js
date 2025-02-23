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
        { type: 'normal', monsterIndex: 'specter', difficulty: 702, goldReward: 76 }, // 702
        { type: 'normal', monsterIndex: 'warhorse-skeleton', difficulty: 709, goldReward: 78 }, // 709
        { type: 'normal', monsterIndex: 'hezrou', difficulty: 700, goldReward: 80 }, // 700
        { type: 'normal', monsterIndex: 'ankheg', difficulty: 705, goldReward: 83 }, // 705
        { type: 'normal', monsterIndex: 'duergar', difficulty: 706, goldReward: 85 }, // 706
        { type: 'normal', monsterIndex: 'spy', difficulty: 704, goldReward: 77 }, // 704
        { type: 'normal', monsterIndex: 'hell-hound', difficulty: 701, goldReward: 79 }, // 701
        { type: 'normal', monsterIndex: 'centaur', difficulty: 707, goldReward: 82 }, // 707
        { type: 'normal', monsterIndex: 'bearded-devil', difficulty: 710, goldReward: 84 }, // 710
        {
          type: 'mini-boss',
          monsterIndex: 'druid', 
          difficulty: '709',
          firstGoldReward: 118,
          goldReward: 86,
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
        { type: 'normal', monsterIndex: 'guard', difficulty: 717, goldReward: 78 }, // 717
        { type: 'normal', monsterIndex: 'bone-devil', difficulty: 706, goldReward: 80 }, // 706
        { type: 'normal', monsterIndex: 'wraith', difficulty: 714, goldReward: 83 }, // 714
        { type: 'normal', monsterIndex: 'salamander', difficulty: 715, goldReward: 85 }, // 715
        { type: 'normal', monsterIndex: 'scout', difficulty: 713, goldReward: 88 }, // 713
        { type: 'normal', monsterIndex: 'chain-devil', difficulty: 720, goldReward: 79 }, // 720
        { type: 'normal', monsterIndex: 'goblin', difficulty: 707, goldReward: 82 }, // 707
        { type: 'normal', monsterIndex: 'wight', difficulty: 705, goldReward: 84 }, // 705
        { type: 'normal', monsterIndex: 'cockatrice', difficulty: 709, goldReward: 86 }, // 709
        {
          type: 'mini-boss',
          monsterIndex: 'unicorn', 
          difficulty: '720',
          firstGoldReward: 122,
          goldReward: 89,
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
        { type: 'normal', monsterIndex: 'zombie', difficulty: 730, goldReward: 80 }, // 730
        { type: 'normal', monsterIndex: 'grimlock', difficulty: 732, goldReward: 95 }, // 732
        { type: 'normal', monsterIndex: 'couatl', difficulty: 726, goldReward: 85 }, // 726
        { type: 'normal', monsterIndex: 'dretch', difficulty: 728, goldReward: 88 }, // 728
        { type: 'normal', monsterIndex: 'xorn', difficulty: 734, goldReward: 90 }, // 734
        { type: 'normal', monsterIndex: 'behir', difficulty: 727, goldReward: 816 }, // 727
        { type: 'normal', monsterIndex: 'gnoll', difficulty: 736, goldReward: 84 }, // 736
        { type: 'normal', monsterIndex: 'tribal-warrior', difficulty: 725, goldReward: 86 }, // 725
        { type: 'normal', monsterIndex: 'imp', difficulty: 721, goldReward: 89 }, // 721
        {
          type: 'mini-boss',
          monsterIndex: 'planetar', 
          difficulty: '740',
          firstGoldReward: 175,
          goldReward: 91,
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
        { type: 'normal', monsterIndex: 'priest', difficulty: 765, goldReward: 94 }, // 765
        { type: 'normal', monsterIndex: 'ice-devil', difficulty: 763, goldReward: 96 }, // 763
        { type: 'normal', monsterIndex: 'invisible-stalker', difficulty: 771, goldReward: 98 }, // 771
        { type: 'normal', monsterIndex: 'death-dog', difficulty: 787, goldReward: 101 }, // 787
        { type: 'normal', monsterIndex: 'ghoul', difficulty: 757, goldReward: 103 }, // 757
        { type: 'normal', monsterIndex: 'orc', difficulty: 747, goldReward: 106 }, // 747
        { type: 'normal', monsterIndex: 'marilith', difficulty: 778, goldReward: 108 }, // 778
        { type: 'normal', monsterIndex: 'erinyes', difficulty: 782, goldReward: 110 }, // 782
        { type: 'normal', monsterIndex: 'sahuagin', difficulty: 790, goldReward: 113 }, // 790
        {
          type: 'mini-boss',
          monsterIndex: 'half-red-dragon-veteran', 
          difficulty: '800',
          firstGoldReward: 180,
          goldReward: 115,
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
        { type: 'normal', monsterIndex: 'ghast', difficulty: 792, goldReward: 94 }, // 792
        { type: 'normal', monsterIndex: 'lemure', difficulty: 797, goldReward: 96 }, // 797
        { type: 'normal', monsterIndex: 'noble', difficulty: 814, goldReward: 98 }, // 814
        { type: 'normal', monsterIndex: 'azer', difficulty: 813, goldReward: 101 }, // 813
        { type: 'normal', monsterIndex: 'pegasus', difficulty: 811, goldReward: 103 }, // 811
        { type: 'normal', monsterIndex: 'efreeti', difficulty: 807, goldReward: 106 }, // 807
        { type: 'normal', monsterIndex: 'androsphinx', difficulty: 810, goldReward: 108 }, // 810
        { type: 'normal', monsterIndex: 'mage', difficulty: 799, goldReward: 110 }, // 799
        { type: 'normal', monsterIndex: 'shadow', difficulty: 812, goldReward: 113 }, // 812
        {
          type: 'mini-boss',
          monsterIndex: 'mummy-lord', 
          difficulty: '815',
          firstGoldReward: 180,
          goldReward: 115,
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
        { type: 'normal', monsterIndex: 'black-pudding', difficulty: 821, goldReward: 94 }, // 821
        { type: 'normal', monsterIndex: 'night-hag', difficulty: 884, goldReward: 96 }, // 884
        { type: 'normal', monsterIndex: 'gargoyle', difficulty: 881, goldReward: 98 }, // 881
        { type: 'normal', monsterIndex: 'basilisk', difficulty: 866, goldReward: 101 }, // 866
        { type: 'normal', monsterIndex: 'merfolk', difficulty: 848, goldReward: 103 }, // 848
        { type: 'normal', monsterIndex: 'gray-ooze', difficulty: 842, goldReward: 106 }, // 842
        { type: 'normal', monsterIndex: 'lemure', difficulty: 838, goldReward: 108 }, // 838
        { type: 'normal', monsterIndex: 'steam-mephit', difficulty: 876, goldReward: 110 }, // 876
        { type: 'normal', monsterIndex: 'lizardfolk', difficulty: 841, goldReward: 113 }, // 841
        {
          type: 'mini-boss',
          monsterIndex: 'treant', 
          difficulty: '890',
          firstGoldReward: 192,
          goldReward: 118,
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
        { type: 'normal', monsterIndex: 'hobgoblin', difficulty: 905, goldReward: 96 }, // 905
        { type: 'normal', monsterIndex: 'water-elemental', difficulty: 889, goldReward: 98 }, // 889
        { type: 'normal', monsterIndex: 'bandit', difficulty: 894, goldReward: 101 }, // 894
        { type: 'normal', monsterIndex: 'assassin', difficulty: 918, goldReward: 103 }, // 918
        { type: 'normal', monsterIndex: 'quasit', difficulty: 916, goldReward: 106 }, // 916
        { type: 'normal', monsterIndex: 'kobold', difficulty: 909, goldReward: 108 }, // 909
        { type: 'normal', monsterIndex: 'guardian-naga', difficulty: 895, goldReward: 110 }, // 895
        { type: 'normal', monsterIndex: 'ochre-jelly', difficulty: 885, goldReward: 113 }, // 885
        { type: 'normal', monsterIndex: 'archmage', difficulty: 924, goldReward: 115 }, // 924
        {
          type: 'boss',
          monsterIndex: 'solar', 
          difficulty: '929',
          firstGoldReward: 204,
          goldReward: 120,
        },
      ],
      unlocksPage: 'finished',
    },
  ],
}
