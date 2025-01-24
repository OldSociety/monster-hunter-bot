// rewardHandler.js

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

  if (!huntData.level) {
    console.error(
      `❌ ERROR: huntData.level is undefined in displayHuntSummary.`
    )
    return interaction.followUp({
      content: 'Error: Invalid hunt data.',
      ephemeral: true,
    })
  }

  const pageKey = huntData.level.page
  const huntId = huntData.level.id

  if (!huntPages[pageKey]) {
    console.error(`❌ ERROR: huntPages[${pageKey}] is undefined!`)
    return interaction.followUp({
      content: `Error: Invalid hunt page (${pageKey}).`,
      ephemeral: true,
    })
  }

  const currentHunt = huntPages[pageKey].hunts.find(
    (hunt) => hunt.id === huntId
  )
  if (!currentHunt) {
    console.error(
      `❌ ERROR: Hunt data not found for ID ${huntId} on page ${pageKey}`
    )
    return interaction.followUp({
      content: 'Error: Hunt not found.',
      ephemeral: true,
    })
  }

  let totalGoldEarned = 0
  let totalTokensEarned = 0

  // ✅ Calculate rewards dynamically from hunt battles
  currentHunt.battles.forEach((battle) => {
    if (
      battle.type === 'mini-boss' &&
      !user.completedHunts.includes(currentHunt.key)
    ) {
      totalGoldEarned += battle.firstGoldReward || battle.goldReward
    } else {
      totalGoldEarned += battle.goldReward
    }

    if (getRandomInt(3) === 0) {
      totalTokensEarned += 1
    }
  })

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
    console.log(
      '✔ Hunt completed. Checking for next unlock...',
      'level id: ',
      huntData.level.id
    )

    // ✅ Increase completedLevels **only if** the hunt was the highest completed so far
    if (huntData.level.id > user.completedLevels) {
      console.log(
        `📈 Increasing completedLevels from ${user.completedLevels} to ${huntData.level.id}`
      )
      user.completedLevels = huntData.level.id
      await user.save()
    }

    console.log(`✅ New completedLevels saved: ${user.completedLevels}`)

    if (currentHunt.unlocks) {
      const nextHunt = huntPages[pageKey].hunts.find(
        (hunt) => hunt.id === currentHunt.unlocks
      )
      if (
        nextHunt && 
        !user.completedHunts.includes(nextHunt.key) && 
        nextHunt.id > user.completedLevels ) {
        console.log(`🔓 Unlocking next hunt: ${nextHunt.name}`)
        user.completedHunts.push(nextHunt.key)
        summaryEmbed.addFields({
          name: 'Next Hunt Unlocked!',
          value: `You have unlocked **${nextHunt.name}**!`,
        })
      }
    }

    if (currentHunt.unlocksPage && huntPages[currentHunt.unlocksPage]) {
      console.log(`📖 Unlocking next hunt page: ${currentHunt.unlocksPage}`)
      summaryEmbed.addFields({
        name: 'New Hunt Page Unlocked!',
        value: `You have unlocked **${
          huntPages[currentHunt.unlocksPage].name
        }**!`,
      })
    }
  }

  summaryEmbed.setThumbnail(
    interaction.user.displayAvatarURL({ format: 'png', size: 128 })
  )

  try {
    await interaction.followUp({ embeds: [summaryEmbed], ephemeral: false })
    console.log('✅ Hunt summary successfully sent.')
  } catch (error) {
    console.error('❌ Error sending hunt summary:', error)
  }
}

module.exports = { displayHuntSummary }
