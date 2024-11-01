const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { grantDailyReward } = require('./helpers/dailyRewardsHandler')
const { User } = require('../../Models/model')
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

    if (hoursSinceLastClaim < 24) {
      // User has already claimed today
      const nextClaimTime = new Date(lastClaim.getTime() + 24 * 3600 * 1000)
      const hoursRemaining = Math.floor((nextClaimTime - now) / 36e5)
      const minutesRemaining = Math.floor(((nextClaimTime - now) % 36e5) / 60000)

      await interaction.reply({
        content: `You've already claimed your daily reward today. Please come back in ${hoursRemaining} hours and ${minutesRemaining} minutes!`,
        ephemeral: true,
      })
      return
    }

    // Grant the daily reward
    try {
      await grantDailyReward(user) // Executes the reward logic
      user.last_daily_claim = now
      await user.save() 

      // Feedback embed based on daily streak progress
      const rewards = [
        '200 coins',
        '3 gems',
        '2 ichor',
        '600 coins',
        '3 gems',
        '3 ichor',
        '1000 coins',
        '3 gems',
        '3 ichor',
        'demon card'
      ]

      const rewardDescription = rewards.map((reward, index) => {
        const hasBeenClaimed = index + 1 < user.daily_streak
        const isBeingClaimedNow = index + 1 === user.daily_streak
        const claimedStatus = hasBeenClaimed ? ' ✅' : ''
        return isBeingClaimedNow
          ? `**Day ${index + 1}: ${reward} ✅**`
          : `Day ${index + 1}: ${reward}${claimedStatus}`
      }).join('\n')

      const rewardEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Daily Rewards Progress')
        .setDescription(rewardDescription)

      await interaction.reply({ embeds: [rewardEmbed] })

    } catch (error) {
      console.error('Error granting daily reward:', error)
      await interaction.reply({
        content: 'An error occurred while trying to claim your daily reward. Please try again later.',
        ephemeral: false,
      })
    }
  },
}
