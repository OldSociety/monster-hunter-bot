const { SlashCommandBuilder, EmbedBuilder } = require('@discordjs/builders')
const { User } = require('../../Models/model.js')
const { setupFreeRewardCollector } = require('./helpers/freeRewardCollector.js') // Adjust the path as necessary

module.exports = {
  data: new SlashCommandBuilder()
    .setName('free')
    .setDescription('Claim your free reward (Available every 8 hours)'),
  async execute(interaction) {
    const userId = interaction.user.id

    try {
      const user = await User.findOne({ where: { user_id: userId } })
      if (!user) {
        await interaction.reply({
          content: "You don't have an account. Use `/account` to create one.",
          ephemeral: true,
        })
        return
      }

      // Debugging: Check the current last_free_claim value
      console.log(`Last claim time from database: ${user.last_free_claim}`)

      const currentTime = new Date()
      const lastClaimTime = user.last_free_claim
        ? new Date(user.last_free_claim)
        : new Date(0)
      const timeSinceLastClaimMs = currentTime - lastClaimTime
      const hoursSinceLastClaim = timeSinceLastClaimMs / (1000 * 60 * 60)

      // Debugging: Log the calculated hours since last claim
      console.log(`Hours since last claim: ${hoursSinceLastClaim}`)

      if (hoursSinceLastClaim >= 8) {
        try {
          const rewardMessage = await interaction.reply({
            content:
              'Your reward is hidden behind one of these doors. Choose wisely:',
            fetchReply: true,
          })

          // Start the reward collector and introduce a timeout
          const collector = setupFreeRewardCollector(rewardMessage)

          collector.on('end', (collected, reason) => {
            if (reason === 'time') {
              // Timeout occurred
              console.log('No selection made')

              return
            }
          })
        } catch (error) {
          console.error('Error in the /free command:', error)
          await interaction.reply({
            content:
              'An error occurred while trying to claim your free reward. Please try again later.',
            ephemeral: true,
          })
        }
      } else {
        // Calculate the remaining time until the next claim is available
        const timeRemaining = 8 - hoursSinceLastClaim
        const hoursRemaining = Math.floor(timeRemaining)
        const minutesRemaining = Math.floor(
          (timeRemaining - hoursRemaining) * 60
        )

        await interaction.reply({
          content: `You need to wait ${hoursRemaining} hours and ${minutesRemaining} minutes before claiming your next free reward.`,
          ephemeral: true,
        })
      }
    } catch (error) {
      console.error('Error in the /free command:', error)
      await interaction.reply({
        content:
          'An error occurred while trying to claim your free reward. Please try again later.',
        ephemeral: true,
      })
    }
  },
}
