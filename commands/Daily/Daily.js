const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { grantDailyReward } = require('./helpers/dailyRewardsHandler')
const { User } = require('../../Models/model')
const moment = require('moment-timezone')

function calculateTimeUntilNextReset() {
  const now = moment().tz('America/Los_Angeles')
  let nextReset

  if (now.hour() < 6) {
    // If before 6 AM today, next reset is today at 6 AM
    nextReset = now.clone().startOf('day').add(6, 'hours')
  } else {
    // If after 6 AM today, next reset is tomorrow at 6 AM
    nextReset = now.clone().add(1, 'day').startOf('day').add(6, 'hours')
  }

  const duration = moment.duration(nextReset.diff(now))
  return {
    hours: duration.hours(),
    minutes: duration.minutes(),
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward!'),
  async execute(interaction) {
    const userId = interaction.user.id
    const user = await User.findByPk(userId)

    if (!user) {
      await interaction.reply({
        content:
          "You don't have an account with us. Please register to claim daily rewards.",
        ephemeral: true,
      })
      return
    }
    // Check if the user has already claimed their daily reward today
    const now = moment().tz('America/Los_Angeles')
    const lastClaim = moment(user.last_daily_claim).tz('America/Los_Angeles')
    if (lastClaim.isSame(now, 'day')) {
      // User has already claimed today
      const nextClaimTime = lastClaim
        .add(1, 'days')
        .startOf('day')
        .add(6, 'hours')
      const duration = moment.duration(nextClaimTime.diff(now))
      await interaction.reply({
        content: `You've already claimed your daily reward today. Please come back in ${duration.hours()} hours and ${duration.minutes()} minutes!`,
        ephemeral: true,
      })
      return
    }
    try {
      // Grant the daily reward

      async function replyWithRewardsStatus(interaction, user) {
        const rewards = [
          '5000 coins',
          'Exclusive Rare Card',
          '30 qubits',
          '10000 coins',
          'Exclusive Epic Card',
          '15000 coins',
          '60 qubits',
        ]

        let description = rewards
        .map((reward, index) => {
          // Check if the reward has been claimed before this interaction
          const hasBeenClaimed = index + 1 < user.daily_streak;
          const isBeingClaimedNow = index + 1 === user.daily_streak;
      
          // Mark previous claimed rewards and the one being claimed now
          let claimedStatus = hasBeenClaimed ? ' ❎' : '';
          let rewardDescription = `Day ${index + 1}: ${reward}`;
      
          // Apply bold formatting and a check to the reward being claimed now
          if (isBeingClaimedNow) {
            rewardDescription = `**${rewardDescription} ❎**`; // Add the green check for the current claim
          } else if (hasBeenClaimed) {
            // Optionally handle previously claimed rewards differently if needed
            rewardDescription = `${rewardDescription}${claimedStatus}`; 
          }
      
          return rewardDescription;
        })
        .join('\n');
      

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#00FF00')
              .setTitle('Daily Rewards Overview')
              .setDescription(description),
          ],
          ephemeral: true,
        })
      }

      // After granting the daily reward...
      await replyWithRewardsStatus(interaction, user)
      await grantDailyReward(user)
      user.last_daily_claim = new Date() // Or use moment() for timezone consistency
      await user.save()
    } catch (error) {
      console.error('Error granting daily reward:', error)
      // Reply to the user that an error occurred
      await interaction.reply({
        content:
          'An error occurred while trying to claim your daily reward. Please try again later.',
        ephemeral: false,
      })
    }
  },
}
