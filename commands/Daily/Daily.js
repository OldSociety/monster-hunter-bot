const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { grantDailyReward } = require('./helpers/dailyRewardsHandler');
const { User, sequelize } = require('../../Models/model');
const { checkUserAccount } = require('../Account/checkAccount.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward!'),

  async execute(interaction) {
    console.log('Executing /daily command');
    await interaction.deferReply();

    const userId = interaction.user.id;
    console.log(`User ID: ${userId}`);
    const user = await checkUserAccount(interaction);
    if (!user) {
      console.log('User not found or does not have an account');
      return;
    }

    const now = new Date();
    const lastClaim = new Date(user.last_daily_claim || 0);
    const hoursSinceLastClaim = Math.abs(now - lastClaim) / 36e5;
    console.log(`Hours since last claim: ${hoursSinceLastClaim}`);

    const displayDay = user.daily_streak % 10 === 0 && user.daily_streak > 0 ? 10 : user.daily_streak % 10 || 1;

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
      'demon card',
    ];

    // If the user has already claimed the reward today
    if (hoursSinceLastClaim < 24) {
      console.log('User has already claimed the daily reward');
      const nextClaimTime = new Date(lastClaim.getTime() + 24 * 3600 * 1000);
      const hoursRemaining = Math.floor((nextClaimTime - now) / 36e5);
      const minutesRemaining = Math.floor(((nextClaimTime - now) % 36e5) / 60000);

      const rewardClaimedEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Daily Rewards Progress')
        .setFooter({
          text: `You've already claimed your daily reward today. Please come back in ${hoursRemaining} hours and ${minutesRemaining} minutes!`,
        });

      await interaction.editReply({ embeds: [rewardClaimedEmbed] });
      return;
    }

    // Grant the daily reward if not claimed today
    try {
      console.log('Starting database transaction');
      await sequelize.transaction(async (t) => {
        console.log('Granting daily reward');
        const rewardMessage = await grantDailyReward(user, interaction);
        
        user.daily_streak = (user.daily_streak % 10) + 1; // Cycle streak between 1-10
        user.last_daily_claim = now; // Update the claim timestamp
        console.log(`Updated user streak: ${user.daily_streak}`);
        await user.save({ transaction: t }); // Save changes atomically
        console.log('User data saved');

        if (rewardMessage) {
          console.log('Sending custom reward message');
          await interaction.editReply(rewardMessage);
        } else {
          const rewardReceived = rewards[displayDay - 1]; // Adjust index for array
          console.log(`Sending reward: ${rewardReceived}`);
          const rewardReceivedEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Daily Reward Received')
            .setDescription(
              `You received ${rewardReceived}! Return tomorrow for your next reward.`
            );

          await interaction.editReply({ embeds: [rewardReceivedEmbed] });
        }
      });
      console.log('Transaction committed successfully');
    } catch (error) {
      console.error('Error granting daily reward:', error);
      await interaction.editReply({
        content:
          'An error occurred while trying to claim your daily reward. Please try again later.',
      });
    }
  },
};

