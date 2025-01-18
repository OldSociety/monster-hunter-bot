const { EmbedBuilder } = require('discord.js')
const { huntPages } = require('../huntPages')

async function addGoldToUser(user, amount) {
  user.gold = (user.gold || 0) + amount
  await user.save()
}

async function displayHuntSummary(interaction, user, huntData, levelCompleted) {
  console.log("🏆 Displaying Hunt Summary...");
  
  if (!user.completedHunts) user.completedHunts = [];

  const summaryEmbed = new EmbedBuilder()
    .setTitle('Hunt Summary')
    .setDescription(
      `**Gold Earned:** 🪙${huntData.totalGoldEarned}\n**Monsters Defeated:** 🧿${huntData.totalMonstersDefeated}`
    )
    .setColor('#FFD700');

  if (huntData.ichorUsed) {
    summaryEmbed.addFields({
      name: 'Ichor Invigoration',
      value: 'You used 🧪ichor during this hunt, boosting your power!',
    });
  }

  if (levelCompleted) {
    console.log("✔ Hunt completed. Checking for next unlock...");

    const nextLevelKey = huntData.level?.unlocks; // ✅ Prevents crash if `huntData.level` is undefined
    console.log(`➡ Next Level Key: ${nextLevelKey}`);

    if (nextLevelKey && huntPages[nextLevelKey]) {
      console.log(`🔓 Unlocking next hunt: ${huntPages[nextLevelKey].name}`);

      if (!user.completedHunts.includes(nextLevelKey)) {
        user.completedHunts.push(nextLevelKey);
        summaryEmbed.addFields({
          name: 'Next Hunt Unlocked!',
          value: `You have unlocked **${huntPages[nextLevelKey].name}**!`,
        });
      }
    } else {
      console.warn("⚠️ No valid next level found or huntPages[nextLevelKey] is undefined.");
    }

    await user.save();
  }

  const avatarURL = interaction.user.displayAvatarURL({ format: 'png', size: 128 });
  summaryEmbed.setThumbnail(avatarURL);

  try {
    await interaction.followUp({ embeds: [summaryEmbed], ephemeral: false });
    console.log("✅ Hunt summary successfully sent.");
  } catch (error) {
    console.error("❌ Error sending hunt summary:", error);
  }
}


module.exports = { addGoldToUser, displayHuntSummary }
