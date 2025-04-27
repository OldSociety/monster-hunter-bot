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

  // Only count the monsters defeated, not all battles
  const defeatedBattles = currentHunt.battles.slice(
    0,
    huntData.totalMonstersDefeated
  )

  defeatedBattles.forEach((battle) => {
    // pay the one-time bonus the very first time this boss is defeated
    if (
      (battle.type === 'mini-boss' || battle.type === 'boss') &&
      currentHunt.id > user.completedLevels && // first clear
      battle.firstGoldReward // field exists
    ) {
      totalGoldEarned += battle.firstGoldReward
    } else {
      totalGoldEarned += battle.goldReward
    }

    if (getRandomInt(3) === 0) totalTokensEarned += 1
  })

  await addRewardToUser(user, totalGoldEarned, totalTokensEarned)

  const winTitle = levelCompleted ? 'Victory ' : 'Defeated '

  const summaryEmbed = new EmbedBuilder()
    .setTitle(`${winTitle}- Hunt Summary`)
    .setDescription(
      `**Gold Earned:** 🪙${totalGoldEarned}\n**Tokens Earned:** 🧿${totalTokensEarned}`
    )
    .setColor('#FFD700')
    .setFooter({
      text: `Available: 🪙${user.gold} ⚡${user.currency.energy} 🧿${user.currency.tokens} 🥚${user.currency.eggs} 🧪${user.currency.ichor} ⚙️${user.currency.gear}`,
    })

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

    // Store the old value before updating
    const previousCompletedLevels = user.completedLevels

    console.log(`🧐 Previous Completed Levels: ${previousCompletedLevels}`)
    console.log(`🧐 Current Hunt ID: ${huntData.level.id}`)

    if (huntData.level.id === user.completedLevels + 1) {
      console.log(
        `📈 Progressing from ${user.completedLevels} → ${huntData.level.id}`
      )
      user.completedLevels = huntData.level.id
      await user.save()

      if (currentHunt.unlocks) {
        const nextHunt = huntPages[pageKey].hunts.find(
          (hunt) => hunt.key === currentHunt.unlocks
        )
        if (nextHunt) {
          console.log(`🔓 Unlocking: ${nextHunt.name}`)

          summaryEmbed.spliceFields(0, 0, {
            name: 'Next Hunt Unlocked!',
            value: `You have unlocked **${nextHunt.name}**!`,
          })

          console.log(`✅ Unlock message added.`)
        }
      }
    }

    // if (currentHunt.unlocksPage && huntPages[currentHunt.unlocksPage]) {
    //   summaryEmbed.addFields({
    //     name: 'New Hunt Page Unlocked!',
    //     value: `You have unlocked **${
    //       huntPages[currentHunt.unlocksPage].name
    //     }**!`,
    //   })
    // } else
    if (currentHunt.unlocksPage === 'finished') {
      summaryEmbed.addFields({
        name: 'All Available Hunts Completed!',
        value:
          'You have completed all the pages so far. Check in regularly for new releases.',
      })
    }
  }

  summaryEmbed.setThumbnail(
    interaction.user.displayAvatarURL({ format: 'png', size: 128 })
  )

  try {
    await interaction.followUp({ embeds: [summaryEmbed], ephemeral: false })
    console.log(`✅ Hunt summary successfully sent.`)
  } catch (error) {
    console.error('❌ Error sending hunt summary:', error)
  }
}

module.exports = { displayHuntSummary }
