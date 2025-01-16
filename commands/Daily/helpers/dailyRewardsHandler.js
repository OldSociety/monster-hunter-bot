const {
  fetchMonsterByName,
  cacheMonstersByTier,
} = require('../../../handlers/pullHandler');
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/userMonsterHandler');
const { updateTop5AndUserScore } = require('../../../handlers/topCardsManager');
const {
  generateMonsterRewardEmbed,
} = require('../../../utils/embeds/monsterRewardEmbed');
const { getStarsBasedOnColor } = require('../../../utils/starRating');
const { classifyMonsterType } = require('../../../utils/huntUtility/huntUtils');
const { EmbedBuilder } = require('discord.js');

const rotatingMonsters = [
  'lemure',
  'nightmare',
  'barbed devil',
  'bone devil',
  'horned devil',
  'erinyes',
  'rakshasa',
  'marilith',
];

let cachePopulated = false;

async function grantDailyReward(user, interaction) { 
  const currentDay = (user.daily_streak + 1) % 10 || 10;
  let rewardEmbed;

  if (currentDay === 10) {
    if (!cachePopulated) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xffcc00)
            .setDescription('Loading daily reward, please wait...'),
        ],
        components: [],
      });

      await cacheMonstersByTier();
      cachePopulated = true;
    }

    const monsterIndex = Math.floor(user.daily_streak / 10) % rotatingMonsters.length;
    const monsterName = rotatingMonsters[monsterIndex];

    const monster = await fetchMonsterByName(monsterName);
    if (monster) {
      await updateOrAddMonsterToCollection(user.user_id, monster);
      await updateTop5AndUserScore(user.user_id);

      const stars = getStarsBasedOnColor(monster.color);
      const category = classifyMonsterType(monster.type);
      const monsterEmbed = generateMonsterRewardEmbed(monster, category, stars);

      rewardEmbed = { embeds: [monsterEmbed] };
    }
  } else {
    const rewards = [
      '🪙200 coins',
      '🥚1 dragon egg',
      '🧪2 demon ichor',
      '🪙600 coins',
      '🥚1 dragon egg',
      '🧪3 demon ichor',
      '🪙1000 coins',
      '🥚1 dragon egg',
      '🧪3 demon ichor',
    ];

    const rewardText = rewards[currentDay - 1] || '🪙200 coins';

    await user.save();

    rewardEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Daily Reward Received')
      .setDescription(`You received ${rewardText}! Return tomorrow for your next reward.`);
  }

  return rewardEmbed;
}

module.exports = { grantDailyReward };
