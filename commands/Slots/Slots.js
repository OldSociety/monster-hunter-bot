const { SlashCommandBuilder } = require('@discordjs/builders')
const { EmbedBuilder } = require('discord.js')
const { setTimeout } = require('timers/promises')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Play the slot machine game!'),
  async execute(interaction) {
    const emojis = ['🗡️', '🛡️', '🐉', '🧌', '⚔️', '☠️', '👑', '🎲', '💎']
    const slotLength = 3 // Number of slots in a row
    const dashes = '-------------'

    // Initial response
    await interaction.reply('🎰 Spinning the slot machine... 🎰')

    let embed = new EmbedBuilder()
      .setTitle('Slot Machine')
      .setFooter({ text: interaction.user.tag })

    // Spinning effect
    for (let i = 0; i < 10; i++) {
      // Generate three different rows of slots
      const row1 = formatRow(
        Array.from({ length: slotLength }, () => getRandomEmoji(emojis))
      )
      const row2 = formatRow(
        Array.from({ length: slotLength }, () => getRandomEmoji(emojis)),
        true
      ) // Add < at the end
      const row3 = formatRow(
        Array.from({ length: slotLength }, () => getRandomEmoji(emojis))
      )

      const description = `\n${dashes}\n${row1}\n${row2} <\n${row3}\n${dashes}`

     // Update embed description
     embed.setDescription(`\`\`\`${description}\`\`\``)
     await interaction.editReply({ embeds: [embed] })
     await setTimeout(500) // Delay for smooth spinning effect
   }

   // Generate final result rows for win/loss determination
   const finalRow1 = Array.from({ length: slotLength }, () => getRandomEmoji(emojis))
   const finalRow2 = Array.from({ length: slotLength }, () => getRandomEmoji(emojis))
   const finalRow3 = Array.from({ length: slotLength }, () => getRandomEmoji(emojis))

  // Check win condition with emphasis on the middle row
  let isWin = false
  let totalPayout = 0

  // Prioritize middle row win condition
  if (checkWinCondition(finalRow2)) {
    isWin = true
    totalPayout += calculatePayout(finalRow2) * 2 // Double payout for middle row wins
  }

  // Check top and bottom rows as secondary win conditions
  if (checkWinCondition(finalRow1)) {
    isWin = true
    totalPayout += calculatePayout(finalRow1)
  }
  if (checkWinCondition(finalRow3)) {
    isWin = true
    totalPayout += calculatePayout(finalRow3)
  }

   // Format final rows for display
   const formattedRow1 = formatRow(finalRow1)
   const formattedRow2 = formatRow(finalRow2, true)
   const formattedRow3 = formatRow(finalRow3)

   embed
     .setTitle(isWin ? `🎉 You Win! 🎉 - Payout: ${totalPayout} coins` : '💔 You Lose! 💔')
     .setDescription(`\`\`\`\n${dashes}\n${formattedRow1}\n${formattedRow2} <\n${formattedRow3}\n${dashes}\`\`\``)

   await interaction.editReply({ embeds: [embed] })
 },
}

// Helper function to get a random emoji from the list
function getRandomEmoji(emojiList) {
 return emojiList[Math.floor(Math.random() * emojiList.length)]
}

// Helper function to format a row with optional < at the end
function formatRow(slotArray, addArrow = false) {
 const paddedRow = slotArray.join(' : ').padEnd(23, ' ') // Adjust padding to fill width as needed
 return addArrow ? `${paddedRow}` : paddedRow
}

// Function to check win condition for a row (any two symbols match)
function checkWinCondition(row) {
 const uniqueSymbols = new Set(row)
 return uniqueSymbols.size < row.length // Win if any two symbols match
}

// Function to calculate payout based on matching symbols
function calculatePayout(row) {
 const uniqueSymbols = new Set(row)
 if (uniqueSymbols.size === 1) {
   return 3 // All three symbols match: 3 coins payout (300%)
 } else if (uniqueSymbols.size === 2) {
   return 1.5 // Two symbols match: 1.5 coins payout (150%)
 }
 return 0 // No match: 0 coins
}