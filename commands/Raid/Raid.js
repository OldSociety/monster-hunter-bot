const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { checkUserAccount } = require('../Account/helpers/checkAccount.js')
const { startRaidEncounter } = require('./raidUtils/raidHandler.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Start a Raid Boss encounter'),

  async execute(interaction) {
  //   if (!interaction.deferred && !interaction.replied) {
  //     await interaction.deferReply({ ephemeral: true })
  //   }
  //   const user = await checkUserAccount(interaction)
  //   if (!user) return
  //   await startRaidEncounter(interaction, user)
  },
}
