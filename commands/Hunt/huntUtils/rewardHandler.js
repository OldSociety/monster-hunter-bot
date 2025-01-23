// rewardHandler.js
const { EmbedBuilder } = require('discord.js')
const { huntPages } = require('../huntPages')

async function addGoldToUser(user, amount) {
  user.gold = (user.gold || 0) + amount
  await user.save()
}

async function displayHuntSummary(interaction, user, huntData, levelCompleted) {
  console.log('🏆 Displaying Hunt Summary...')

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
    console.log('✔ Hunt completed. Checking for next unlock...')

    const currentPage = huntData.level?.page || 'page1' // ✅ Ensure we track the correct page
    const nextLevelKey = huntData.level?.unlocks
    const nextPageKey = huntData.level?.unlocksPage

    console.log(`➡ Current Page: ${currentPage}`)
    console.log(`➡ Next Level Key: ${nextLevelKey}`)
    console.log(`➡ Next Page Key: ${nextPageKey}`)

    // Ensure completedLevels exists as an object
    if (!user.completedLevels) user.completedLevels = {}

    // Unlock the next hunt within the same page
    if (nextLevelKey) {
      const nextHunt = huntPages[currentPage].hunts.find(
        (hunt) => hunt.key === nextLevelKey
      )
      if (nextHunt) {
        console.log(`🔓 Unlocking next hunt: ${nextHunt.name}`)
        if (!user.completedHunts.includes(nextLevelKey)) {
          user.completedHunts.push(nextLevelKey)
          summaryEmbed.addFields({
            name: 'Next Hunt Unlocked!',
            value: `You have unlocked **${nextHunt.name}**!`,
          })

          const huntNumber = parseInt(nextLevelKey.replace('hunt', ''), 10)
          if (huntNumber > (user.completedLevels[currentPage] || 0)) {
            console.log(
              `📈 Increasing completedLevels for ${currentPage} from ${user.completedLevels[currentPage]} to ${huntNumber}`
            )
            user.completedLevels[currentPage] = huntNumber
          }
        }
      } else {
        console.warn(
          `⚠️ No valid next level found for ${nextLevelKey} in ${currentPage}.`
        )
      }
    }

    // Unlock the next hunt page
    if (nextPageKey) {
      console.log(`📖 Unlocking next hunt page: ${nextPageKey}`)

      if (!huntPages[nextPageKey]) {
        console.error(`❌ ERROR: huntPages[${nextPageKey}] is undefined!`)
      } else {
        // No need to store in database, simply inform the user
        summaryEmbed.addFields({
          name: 'New Hunt Page Unlocked!',
          value: `You have unlocked **${huntPages[nextPageKey].name}**! Use /hunt to access it.`,
        })

        console.log(
          `🔄 Automatically updating user's current page to ${nextPageKey}`
        )
        user.unlockedPage = nextPageKey
      }
    }

    await user.save()
  }

  const avatarURL = interaction.user.displayAvatarURL({
    format: 'png',
    size: 128,
  })
  summaryEmbed.setThumbnail(avatarURL)

  try {
    await interaction.followUp({ embeds: [summaryEmbed], ephemeral: false })
    console.log('✅ Hunt summary successfully sent.')
  } catch (error) {
    console.error('❌ Error sending hunt summary:', error)
  }
}

module.exports = { addGoldToUser, displayHuntSummary }
