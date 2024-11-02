const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Provides a list of all available commands or detailed info on a specific command')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('The specific command you want more information about')
        .setRequired(false)
    ),

  async execute(interaction) {
    const commandName = interaction.options.getString('command')
    const commands = {
      daily: 'Claim your daily reward. Available once per day.',
      hunt: 'Hunt creatures and earn rewards based on your encounters.',
      list: 'ADMIN ONLY: Lists the number of monsters by CR tier or search by monster name.',
      shop: 'Buy monster packs to expand your collection.',
      free: 'Claim a free reward every 8 hours.',
      status: 'See current score and collection progress, specify `/status <brute/caster/sneak>` to see category specifics'
    }

    if (commandName) {
      // Detailed information for a specific command
      const commandInfo = commands[commandName.toLowerCase()]
      if (!commandInfo) {
        await interaction.reply({
          content: `Command "${commandName}" not found.`,
          ephemeral: true,
        })
        return
      }
      
      const commandEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`Help: /${commandName}`)
        .setDescription(commandInfo)
      await interaction.reply({ embeds: [commandEmbed] })
      
    } else {
      // General list of commands
      const commandList = Object.keys(commands)
        .map(cmd => `/${cmd}`)
        .join(' ')

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('Command List')
        .setDescription('Use `/help <command name>` for more information')
        .addFields(
          { name: ':SSTier: Card Game', value: commandList }
        )
      await interaction.reply({ embeds: [embed] })
    }
  },
}
