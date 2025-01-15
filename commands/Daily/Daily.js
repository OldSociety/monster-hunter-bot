const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { grantDailyReward } = require('./helpers/dailyRewardsHandler')
const { User, sequelize } = require('../../Models/model')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward!'),

  async execute(interaction) {
    await interaction.deferReply()

    const userId = interaction.user.id
    const user = await User.findOne({ where: { id: userId } })

    if (!user) {
      await interaction.editReply('You need to create an account first!')
      return
    }

    const now = new Date()
    const lastClaim = new Date(user.last_daily_claim || 0)
    const hoursSinceLastClaim = Math.abs(now - lastClaim) / 36e5

    let rewardMessage
    try {
      await sequelize.transaction(async (t) => {
        // Determine streak logic
        if (hoursSinceLastClaim >= 48) {
          user.daily_streak = 1 // Reset streak if over 48 hours since last claim
        } else if (hoursSinceLastClaim >= 24) {
          user.daily_streak += 1 // Increment streak if claim is within the 24-48 hour window
        } else {
          const nextClaimTime = new Date(lastClaim.getTime() + 24 * 3600 * 1000)
          const hoursRemaining = Math.floor((nextClaimTime - now) / 36e5)
          const minutesRemaining = Math.floor(
            ((nextClaimTime - now) % 36e5) / 60000
          )

          const rewardClaimedEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Daily Rewards Progress')
            .setDescription(`You've already claimed your reward today.`)
            .setFooter({
              text: `Please come back in ${hoursRemaining} hours and ${minutesRemaining} minutes!`,
            })

          await interaction.editReply({ embeds: [rewardClaimedEmbed] })
          return
        }

        // Update claim timestamp
        user.last_daily_claim = now

        // Grant the reward
        rewardMessage = await grantDailyReward(user, interaction, {
          transaction: t,
        })

        await user.save({ transaction: t })
      })

      // Respond with the reward message
      if (rewardMessage) {
        await interaction.editReply(rewardMessage)
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
          'demon card',
        ]

        const rewardReceived = rewards[user.daily_streak % 10 || 1]
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
