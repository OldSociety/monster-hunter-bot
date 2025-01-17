const { EmbedBuilder } = require('discord.js')
const { huntPages } = require('../huntPages')

async function addGoldToUser(user, amount) {
  user.gold = (user.gold || 0) + amount
  await user.save()
}

async function displayHuntSummary(interaction, user, huntData, levelCompleted) {
  if (!user.completedHunts) user.completedHunts = []

  const summaryEmbed = new EmbedBuilder()
    .setTitle('Hunt Summary')
    .setDescription(
      `**Gold Earned:** 🪙${huntData.totalGoldEarned}\n**Monsters Defeated:** 🧿${huntData.totalMonstersDefeated}`
    )
    .setColor('#FFD700')

  if (huntData.ichorUsed) {
    summaryEmbed.addFields({
      name: 'Ichor Invigoration',
      value: 'You used 🧪ichor during this hunt, boosting your power!',
    })
  }

  if (levelCompleted) {
    const nextLevelKey = huntData.level.unlocks
    if (nextLevelKey && !user.completedHunts.includes(nextLevelKey)) {
      user.completedHunts.push(nextLevelKey)
      summaryEmbed.addFields({
        name: 'Next Hunt Unlocked!',
        value: `You have unlocked **${huntPages[nextLevelKey].name}**!`,
      })
    }
    await user.save()
  }

  const avatarURL = interaction.user.displayAvatarURL({ format: 'png', size: 128 })
  summaryEmbed.setThumbnail(avatarURL)

  await interaction.followUp({ embeds: [summaryEmbed], ephemeral: false })
}

module.exports = { addGoldToUser, displayHuntSummary }
