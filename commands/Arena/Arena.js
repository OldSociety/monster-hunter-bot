const { SlashCommandBuilder } = require('@discordjs/builders')
const fs = require('fs')
const path = require('path')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arena')
    .setDescription('Manage your Arena battles and stats')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('overview')
        .setDescription('View your Arena stats and allocate points')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('fight').setDescription('Battle in the Arena')
    )
    .addSubcommand((subcommand) =>
        subcommand
          .setName('inventory')
          .setDescription('View and manage your inventory.')
          .addStringOption((option) =>
            option
              .setName('type')
              .setDescription('Filter by item type.')
              .addChoices(
                { name: 'Weapons', value: 'weapon' },
                { name: 'Defense', value: 'defense' },
                { name: 'Consumables', value: 'consumable' }
              )
          )
      ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand()
    const subcommandFile = path.join(
      __dirname,
      'subcommands',
      `${subcommand}.js`
    )

    if (fs.existsSync(subcommandFile)) {
      const command = require(subcommandFile)
      return command.execute(interaction)
    } else {
      return interaction.reply({
        content: 'Subcommand not implemented yet.',
        ephemeral: true,
      })
    }
  },
}
