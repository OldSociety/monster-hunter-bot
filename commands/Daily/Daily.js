const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { grantDailyReward } = require('./helpers/dailyRewardsHandler')
const { User } = require('../../Models/model')
const cron = require('node-cron')

// // Reset daily streak at 6 AM PST daily
// cron.schedule('0 6 * * *', async () => {
//   await User.update({ daily_streak: 1 }, { where: {} })
//   console.log('Daily streak reset for all users.')
// })

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward!'),
  async execute(interaction) {
    const userId = interaction.user.id
    const user = await User.findByPk(userId)

    if (!user) {
      user = await User.create({
        user_id: userId,
        user_name: interaction.user.username,
        gold: 1000,
      })
    }

    // Check if the user has already claimed their daily reward today
    const lastClaim = new Date(user.last_daily_claim || 0)
    const now = new Date()

    // Calculate hours since last claim
    const hoursSinceLastClaim = Math.abs(now - lastClaim) / 36e5
    const displayDay = user.daily_streak % 10 === 0 && user.daily_streak > 0 ? 10 : user.daily_streak % 10 || 1;


    // Rewards list
    const rewards = [
      '🪙200 coins',
      '💎3 gems',
      '🧪2 ichor',
      '🪙600 coins',
      '💎3 gems',
      '🧪3 demon ichor',
      '🪙1000 coins',
      '💎3 gems',
      '🧪3 demon ichor',
      'demon card',
    ]

    // Generate reward description for the embed
    const rewardDescription = rewards
      .map((reward, index) => {
        const dayNumber = index + 1
        const hasBeenClaimed = dayNumber < displayDay
        const isBeingClaimedNow = dayNumber === displayDay
        const claimedStatus = hasBeenClaimed ? ' ✅' : ''
        
        // Highlight the current day's reward being claimed
        return isBeingClaimedNow
          ? `**Day ${dayNumber}: ${reward} ✅**`
          : `Day ${dayNumber}: ${reward}${claimedStatus}`
      })
      .join('\n')

    // Determine if the user has already claimed the reward today
    if (hoursSinceLastClaim < 24) {
      // User has already claimed today, show "already claimed" embed with next claim time
      const nextClaimTime = new Date(lastClaim.getTime() + 24 * 3600 * 1000)
      const hoursRemaining = Math.floor((nextClaimTime - now) / 36e5)
      const minutesRemaining = Math.floor(
        ((nextClaimTime - now) % 36e5) / 60000
      )

      const rewardClaimedEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Daily Rewards Progress')
        .setDescription(rewardDescription)
        .setFooter({
          text: `You've already claimed your daily reward today. Please come back in ${hoursRemaining} hours and ${minutesRemaining} minutes!`,
        })

      await interaction.reply({ embeds: [rewardClaimedEmbed] })
      return
    }

    // Grant the daily reward if not claimed today
    try {
      await grantDailyReward(user, interaction) // Executes the reward logic
      user.last_daily_claim = now
      await user.save()

      // Display embed showing the reward received today
      const rewardReceived = rewards[displayDay]
      const rewardReceivedEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Daily Reward Received')
        .setDescription(
          `You received ${rewardReceived}! Return tomorrow for your next reward.`
        )

      await interaction.reply({ embeds: [rewardReceivedEmbed] })
    } catch (error) {
      console.error('Error granting daily reward:', error)
      await interaction.reply({
        content:
          'An error occurred while trying to claim your daily reward. Please try again later.',
        ephemeral: false,
      })
    }
  },
}
