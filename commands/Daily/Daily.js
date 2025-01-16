const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { grantDailyReward } = require('./helpers/dailyRewardsHandler')
const { User } = require('../../Models/model')
const { checkUserAccount } = require('../Account/checkAccount.js')

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

    if (hoursSinceLastClaim < 24) {
      const nextClaimTime = new Date(lastClaim.getTime() + 24 * 3600 * 1000)
      const hoursRemaining = Math.floor((nextClaimTime - now) / 36e5)
      const minutesRemaining = Math.floor(
        ((nextClaimTime - now) % 36e5) / 60000
      )

      const rewardClaimedEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Daily Rewards Progress')
        .setFooter({
          text: `You've already claimed your daily reward today. Please come back in ${hoursRemaining} hours and ${minutesRemaining} minutes!`,
        })

      return interaction.editReply({ embeds: [rewardClaimedEmbed] })
    }

    try {
      const rewardMessage = await grantDailyReward(user, interaction)

      user.daily_streak = (user.daily_streak % 10) + 1
      user.last_daily_claim = now
      await user.save()

      if (rewardMessage) {
        await interaction.editReply(rewardMessage)
      } else {
        const rewardReceivedEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('Daily Reward Received')
          .setDescription(
            `You received your daily reward! Return tomorrow for your next reward.`
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
