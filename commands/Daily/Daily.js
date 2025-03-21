const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { grantDailyReward } = require('./helpers/dailyRewardsHandler')
const { User } = require('../../Models/model')
const { checkUserAccount } = require('../Account/helpers/checkAccount.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward!'),

  async execute(interaction) {
    await interaction.deferReply()

    const user = await checkUserAccount(interaction)
    if (!user) {
      return interaction.editReply({
        content: 'You need an account to claim daily rewards!',
        ephemeral: true,
      })
    }

    const now = new Date()
    const lastClaim = new Date(user.last_daily_claim || 0)
    const hoursSinceLastClaim = Math.abs(now - lastClaim) / 36e5

    const displayDay =
      user.daily_streak % 10 === 0 && user.daily_streak > 0
        ? 10
        : user.daily_streak % 80 || 1

    const rewards = [
      '🪙1000 coins',
      '🥚2 dragon egg',
      '🧪3 demon ichor',
      '🪙3000 coins',
      '🥚3 dragon egg',
      '🧪3 demon ichor',
      '🪙6000 coins',
      '🥚3 dragon egg',
      '🧪3 demon ichor',
      'Demon Card 🃏',
    ]

    // Restore the reward progression display
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

      return interaction.editReply({ embeds: [rewardClaimedEmbed] })
    }

    // Grant the daily reward if not claimed today
    try {
      const rewardMessage = await grantDailyReward(user, interaction)

      user.daily_streak += 1 // 🔹 Simply increment daily streak

      if (user.daily_streak > 80) {
        user.daily_streak = 1 // 🔹 Reset after 80 days
      }
      user.last_daily_claim = now
      await user.save()

      if (rewardMessage && rewardMessage.embeds?.length > 0) {
        await interaction.editReply(rewardMessage)
      } else {
        const rewardReceived = rewards[displayDay - 1]
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
        embeds: [
          new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('Error')
            .setDescription(
              'An error occurred while trying to claim your daily reward. Please try again later.'
            ),
        ],
      })
    }
  },
}
