// specialtySelection.js

const { EmbedBuilder } = require('discord.js')
const { User } = require('../Models/model')

module.exports = async function handleSpecialtySelection(interaction) {
  const selectedSpecialty = interaction.customId

  try {
    // Fetch user by their Discord user_id (interaction.user.id)
    let user = await User.findOne({
      where: { user_id: interaction.user.id },
    })

    if (user) {
      await user.update({ specialty: selectedSpecialty })

      console.log(
        `Updated user ${interaction.user.username}'s specialty to: ${selectedSpecialty}`
      )
    } else {
      console.error(`User not found: ${interaction.user.username}`)
    }
  } catch (error) {
    console.error('Error updating user specialty:', error)
  }

  // Create a confirmation embed
  const confirmEmbed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('Specialty Selected')
    .setDescription(
      `You selected **${
        selectedSpecialty.charAt(0).toUpperCase() + selectedSpecialty.slice(1)
      }**. Let the hunt begin!`
    )

  // Update the interaction with the confirmation
  await interaction.update({ embeds: [confirmEmbed], components: [] })

  console.log(`User selected: ${selectedSpecialty}`)
}
