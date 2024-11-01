// const { SlashCommandBuilder } = require('discord.js')
// const { User } = require('../../Models/model.js')
// const { setupFreeRewardCollector } = require('./helpers/freeRewardCollector.js')

// module.exports = {
//   data: new SlashCommandBuilder()
//     .setName('free')
//     .setDescription('Claim your free reward (Available every 8 hours)'),
//   // async execute(interaction) {
//   //   const userId = interaction.user.id

//   //   try {
//   //     let user = await User.findOne({ where: { user_id: userId } })
//   //     if (!user) {
//   //       user = await User.create({
//   //         user_id: userId,
//   //         user_name: interaction.user.username,
//   //         gold: 1000,
//   //       })
//   //     }

//   //     const currentTime = new Date()
//   //     const lastClaimTime = user.last_free_claim
//   //       ? new Date(user.last_free_claim)
//   //       : new Date(0)
//   //     const timeSinceLastClaimMs = currentTime - lastClaimTime
//   //     const hoursSinceLastClaim = timeSinceLastClaimMs / (1000 * 60 * 60)

//   //     if (hoursSinceLastClaim >= 8) {
//   //       const rewardMessage = await interaction.reply({
//   //         content: 'Your reward is hidden behind one of these doors. Choose wisely:',
//   //         fetchReply: true,
//   //       })

//   //       setupFreeRewardCollector(rewardMessage)

//   //       user.last_free_claim = currentTime
//   //       await user.save()
//   //     } else {
//   //       const timeRemaining = 8 - hoursSinceLastClaim
//   //       const hoursRemaining = Math.floor(timeRemaining)
//   //       const minutesRemaining = Math.floor((timeRemaining - hoursRemaining) * 60)

//   //       // Reply with the time remaining message
//   //       await interaction.reply({
//   //         content: `You need to wait ${hoursRemaining} hours and ${minutesRemaining} minutes before claiming your next free reward.`,
//   //         ephemeral: true,
//   //       })
//   //     }
//   //   } catch (error) {
//   //     console.error('Error in the /free command:', error)
//   //     await interaction.reply({
//   //       content: 'An error occurred while trying to claim your free reward. Please try again later.',
//   //       ephemeral: true,
//   //     })
//   //   }
//   // },
// }
