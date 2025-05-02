const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SlashCommandBuilder } = require('discord.js')
// const { User, Arena, } = require('../../Models')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arena')
    .setDescription('Access arena features and manage your arena profile.')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('overview')
        .setDescription(
          'View your Blood Hunter character sheet (stats, abilities, equipment, and allocations).'
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('fight').setDescription('Engage in an arena fight.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('worldboss')
        .setDescription('Take on the server-wide worldboss challenge.')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('inventory')
        .setDescription('Manage and equip your arena abilities and weapons.')
    ),

  async execute(interaction) {
//     const allowedChannels = [process.env.BOTTESTCHANNELID]
//     if (!allowedChannels.includes(interaction.channel.id)) {
//       await interaction.reply({
//         content: '🚫 This command can only be used in the designated channels.',
//         ephemeral: true,
//       })
//       return
//     }

//     const userId = interaction.user.id
//     const subcommand = interaction.options.getSubcommand()

//     if (subcommand === 'overview') {
//       const generateBloodHunterWelcomeEmbed = (player) => {
//         // Calculate derived attributes using:
//         // Attribute = allocated + (4 + 0.1 * corresponding style score)
//         const strength = player.allocatedStrength + (4 + 0.1 * player.brute)
//         const defense = player.allocatedDefense + (4 + 0.1 * player.stealth)
//         const intelligence =
//           player.allocatedIntelligence + (4 + 0.1 * player.spellsword)
//         const agility = player.allocatedAgility + (4 + 0.1 * player.stealth)

//         let description =
//           `Welcome to Blood Hunter Arena!\n\n` +
//           `Your account uses your style scores to build your combat attributes. Here’s how it works:\n` +
//           `• **Strength** is built from your Brute score: Base = 4 + 0.1 × Brute, plus any extra points you add (max 10).\n` +
//           `• **Defense** and **Agility** come from your Stealth score: Base = 4 + 0.1 × Stealth, plus extra allocations.\n` +
//           `• **Intelligence** is built from your Spellsword score: Base = 4 + 0.1 × Spellsword, plus extra allocations.\n\n` +
//           `**Your Current Stats:**\n` +
//           `• Strength: ${strength}\n` +
//           `• Defense: ${defense}\n` +
//           `• Intelligence: ${intelligence}\n` +
//           `• Agility: ${agility}\n\n` +
//           `You have **${player.statPoints} allocation points** to distribute (maximum 10 per attribute) to further boost your stats.\n` +
//           `Use the buttons below to allocate your extra points.`

//         return new EmbedBuilder()
//           .setTitle(`${player.username}'s Blood Hunter Account`)
//           .setDescription(description)
//           .setFooter({ text: `Brute: ${User.brute_score} | Spellsword: ${player.spellsword} | Stealth: ${player.stealth}\n\n` })
//           .setColor('DarkRed')
//       }

//       // Build allocation buttons for each attribute
//       const allocationRow = new ActionRowBuilder().addComponents(
//         new ButtonBuilder()
//           .setCustomId('alloc_strength')
//           .setLabel('STR +1')
//           .setStyle('Primary'),
//         new ButtonBuilder()
//           .setCustomId('alloc_defense')
//           .setLabel('DEF +1')
//           .setStyle('Primary'),
//         new ButtonBuilder()
//           .setCustomId('alloc_intelligence')
//           .setLabel('INT +1')
//           .setStyle('Primary'),
//         new ButtonBuilder()
//           .setCustomId('alloc_agility')
//           .setLabel('AGI +1')
//           .setStyle('Primary')
//       )

//       // Example usage in your command execution:
//       async function executeWelcome(interaction, player) {
//         const welcomeEmbed = generateBloodHunterWelcomeEmbed(player)
//         const components = player.statPoints > 0 ? [allocationRow] : []

//         await interaction.reply({
//           embeds: [welcomeEmbed],
//           components,
//           ephemeral: true,
//         })

//         // Set up a collector for allocation button presses as in your previous implementation.
//         // When a button is pressed, increment the corresponding allocated field (ensuring it doesn’t exceed 10),
//         // decrement player.statPoints, recalculate the derived attributes, and update the embed.
//       }
//     } else if (subcommand === 'fight') {
//       // Implement arena fight logic here.
//     } else if (subcommand === 'worldboss') {
//       // Implement worldboss challenge logic here.
//     } else if (subcommand === 'inventory') {
//       // Implement inventory management logic here.
//     }
  },
}
