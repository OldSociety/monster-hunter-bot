const { EmbedBuilder } = require('discord.js')
const { huntPages } = require('../huntPages')

function getRandomInt(max) {
  return Math.floor(Math.random() * max)
}

async function addRewardToUser(user, goldAmount = 0, tokenAmount = 0) {
  goldAmount = Number(goldAmount) || 0
  tokenAmount = Number(tokenAmount) || 0

  user.gold = (Number(user.gold) || 0) + goldAmount
  user.currency = {
    ...user.currency,
    tokens: (Number(user.currency.tokens) || 0) + tokenAmount,
  }

  console.log(
    `💰 Rewarding User ${user.user_id}: +${goldAmount} Gold, +${tokenAmount} Tokens`
  )

  await user.save()
}

async function displayHuntSummary(interaction, user, huntData, levelCompleted) {
  console.log('🏆 Displaying Hunt Summary...')

  if (!user.completedHunts) user.completedHunts = []

  // ✅ Calculate rewards dynamically from hunt battles
  const currentPage = huntData.level?.page || 'page1'
  const currentHunt = huntPages[currentPage]?.hunts.find(
    (hunt) => hunt.key === huntData.level.key
  )

  if (!currentHunt) {
    console.error(`❌ Error: Hunt data not found for ${huntData.level.key}`)
    return
  }

  let totalGoldEarned = 0
  let totalTokensEarned = 0

  // ✅ Loop through battles to calculate gold & randomize token drops
  currentHunt.battles.forEach((battle, index) => {
    // First-time completion of a mini-boss gives firstGoldReward
    if (
      battle.type === 'mini-boss' &&
      !user.completedHunts.includes(currentHunt.key)
    ) {
      totalGoldEarned += battle.firstGoldReward || battle.goldReward
    } else {
      totalGoldEarned += battle.goldReward
    }

    // 🎲 33% chance per battle for a token
    if (getRandomInt(3) === 0) {
      totalTokensEarned += 1
    }
  })

  // ✅ Add rewards before displaying summary
  await addRewardToUser(user, totalGoldEarned, totalTokensEarned)

  const summaryEmbed = new EmbedBuilder()
    .setTitle('Hunt Summary')
    .setDescription(
      `**Gold Earned:** 🪙${totalGoldEarned}\n**Tokens Earned:** 🧿${totalTokensEarned}`
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

    const nextLevelKey = huntData.level?.unlocks
    const nextPageKey = huntData.level?.unlocksPage

    console.log(`➡ Next Level Key: ${nextLevelKey}`)
    console.log(`➡ Next Page Key: ${nextPageKey}`)

    // ✅ Increase `completedLevels` **only if** the huntNumber is higher
    const huntNumber = parseInt(huntData.level.key.replace('hunt', ''), 10)
    if (huntNumber >= user.completedLevels) {
      console.log(
        `📈 Increasing completedLevels from ${user.completedLevels} to ${
          huntNumber + 1
        }`
      )
      user.completedLevels = huntNumber + 1 // Increase only when reaching a new furthest level
    }

    // ✅ Unlock the next hunt if available
    if (nextLevelKey) {
      const nextHunt = huntPages[currentPage]?.hunts.find(
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
        }
      } else {
        console.warn(
          `⚠️ No valid next level found for ${nextLevelKey} in ${currentPage}.`
        )
      }
    }

    // ✅ Unlock next hunt page if applicable
    if (nextPageKey) {
      console.log(`📖 Unlocking next hunt page: ${nextPageKey}`)

      if (!huntPages[nextPageKey]) {
        console.error(`❌ ERROR: huntPages[${nextPageKey}] is undefined!`)
      } else {
        summaryEmbed.addFields({
          name: 'New Hunt Page Unlocked!',
          value: `You have unlocked **${huntPages[nextPageKey].name}**! Use /hunt to access it.`,
        })
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

module.exports = { displayHuntSummary }
