const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { User, Investigator } = require('../../Models/model') // Assuming Investigator is defined here

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Admin-only: Reset the user data for testing purposes')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('Select a user to reset')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const isAdmin = interaction.guild.roles.cache.get(process.env.ADMINROLEID)

      // Check if the executing user has the admin role
      if (!interaction.member.roles.cache.has(process.env.ADMINROLEID)) {
        return interaction.reply({
          content: 'You do not have permission to run this command.',
          ephemeral: true,
        })
      }

      const targetUser = interaction.options.getUser('target') // Get the selected user
      const targetUserId = targetUser.id

      // Find the user in the database
      let userData = await User.findOne({ where: { user_id: targetUserId } })

      if (!userData) {
        return interaction.reply({
          content: 'No account found for the selected user.',
          ephemeral: true,
        })
      }

      // Create a confirmation button
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Reset User Confirmation')
        .setDescription(
          `Are you sure you want to reset **${targetUser.username}**'s account? This action cannot be undone.`
        )

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_reset')
          .setLabel('Confirm Reset')
          .setStyle(ButtonStyle.Danger)
      )

      // Reply with the confirmation embed and button
      await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        ephemeral: true,
      })

      // Wait for the confirmation button to be pressed
      const filter = (i) =>
        i.customId === 'confirm_reset' && i.user.id === interaction.user.id

      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000, // 15 seconds to confirm
      })

      collector.on('collect', async (i) => {
        if (i.customId === 'confirm_reset') {
          // Delete investigators associated with the user
          await Investigator.destroy({
            where: { userId: targetUserId },
          })

          // Delete the user account
          await userData.destroy()

          // Create the deletion confirmation embed
          const deletionEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('User Account Deleted')
            .setDescription(
              `**${targetUser.username}**'s account and all associated investigators have been successfully reset.`
            )

          // Update the original interaction with the deletion confirmation embed
          await i.update({
            embeds: [deletionEmbed], // Replace the confirmation embed with the success message
            components: [], // Remove the buttons
            ephemeral: true,
          })
        }
      })

      collector.on('end', (collected) => {
        if (!collected.size) {
          interaction.followUp({
            content: 'Reset action timed out. No changes were made.',
            ephemeral: true,
          })
        }
      })
    } catch (error) {
      console.error('❌ Error:', error)
      await interaction.reply({
        content: 'There was an error resetting the user account.',
        ephemeral: true,
      })
    }
  },
}
