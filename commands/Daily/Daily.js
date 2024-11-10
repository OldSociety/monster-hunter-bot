const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { grantDailyReward } = require('./helpers/dailyRewardsHandler')
const { User } = require('../../Models/model')
const { checkUserAccount } = require('../Account/checkAccount.js')
const cron = require('node-cron')

// Reset daily streak at 6 AM PST daily
cron.schedule('0 6 * * *', async () => {
  await User.update({ daily_streak: 1 }, { where: {} })
  console.log('Daily streak reset for all users.')
})

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward!'),
  async execute(interaction) {
    await interaction.deferReply()
    const userId = interaction.user.id
    const user = await checkUserAccount(interaction)
    if (!user) return

    // Check if the user has already claimed their daily reward today
    const lastClaim = new Date(user.last_daily_claim || 0)
    const now = new Date()
    const hoursSinceLastClaim = Math.abs(now - lastClaim) / 36e5

    const displayDay = user.daily_streak % 10 === 0 && user.daily_streak > 0 ? 10 : user.daily_streak % 10 || 1;

    const rewards = [
      '🪙200 coins',
      '🧿3 gems',
      '🧪2 demon ichor',
      '🪙600 coins',
      '🧿3 gems',
      '🧪3 demon ichor',
      '🪙1000 coins',
      '🧿3 gems',
      '🧪3 demon ichor',
      'demon card',
    ]

    const rewardDescription = rewards
      .map((reward, index) => {
        const dayNumber = index + 1
        const hasBeenClaimed = dayNumber < displayDay
        const isBeingClaimedNow = dayNumber === displayDay
        const claimedStatus = hasBeenClaimed ? ' ✅' : ''

        return isBeingClaimedNow
          ? `**Day ${dayNumber}: ${reward} ✅**`
          : `Day ${dayNumber}: ${reward}${claimedStatus}`
      })
      .join('\n')

    // If the user has already claimed the reward today
    if (hoursSinceLastClaim < 24) {
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

      await interaction.editReply({ embeds: [rewardClaimedEmbed] })
      return
    }

    // Grant the daily reward if not claimed today
    try {
      const rewardMessage = await grantDailyReward(user, interaction)

      if (rewardMessage) {
        // If rewardMessage exists (likely on day 10 with the monster embed), use it
        await interaction.editReply(rewardMessage)
      } else {
        // Default daily reward message for days 1-9
        const rewardReceived = rewards[displayDay]
        const rewardReceivedEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Daily Reward Received')
          .setDescription(
            `You received ${rewardReceived}! Return tomorrow for your next reward.`
          )

        await interaction.editReply({ embeds: [rewardReceivedEmbed] })
      }
    } catch (error) {
      console.error('Error granting daily reward:', error)
      await interaction.editReply({
        content:
          'An error occurred while trying to claim your daily reward. Please try again later.',
      })
    }
  },
}
