// utils/checkUserAccount.js

const { EmbedBuilder } = require('discord.js')
const { User } = require('../../../Models/model.js')

async function checkUserAccount(interaction) {
  const userId = interaction.user.id
  const user = await User.findOne({ where: { user_id: userId } })

  if (!user) {
    const accountEmbed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('No Account Found')
      .setDescription(
        `You need to create an account before using this command.\nPlease ` +
          '``' +
          `/account` +
          '``' +
          `to get started.`
      )
      .setFooter({ text: 'Use /account to create your game account.' })
      .setThumbnail(interaction.user.displayAvatarURL())

    if (interaction.deferred) {
      // If the interaction is deferred, use editReply
      await interaction.editReply({ embeds: [accountEmbed], ephemeral: true })
    } else {
      // If not deferred, use reply
      await interaction.reply({ embeds: [accountEmbed], ephemeral: true })
    }
    return null
  }
  return user
}

module.exports = { checkUserAccount }
