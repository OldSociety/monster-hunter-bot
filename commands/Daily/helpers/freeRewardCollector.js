const { EmbedBuilder } = require('discord.js')
const { User, Collection } = require('../../../Models/model.js')
const { pullValidMonster } = require('../../../handlers/pullHandler.js')

// Utility function to transform rarity identifiers
function transformRarityIdentifier(rarity) {
  return rarity || 'Unknown Rarity'
}

async function setupFreeRewardCollector(rewardMessage) {
  const rewards = [
    800, 
    800,
    1000,
    1200, 
    2000, 
    'gems',
    Math.random() < 0.8
      ? await pullValidMonster({ name: 'Common' })
      : await pullValidMonster({ name: 'Uncommon' }), 
  ]
  
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣']

  // Shuffle the rewards
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }
  shuffleArray(rewards)

  const usersWhoClaimed = new Set() // Track users who claimed
  console.log(usersWhoClaimed)

  const filter = (reaction, user) => {
    return (
      !user.bot &&
      emojis.includes(reaction.emoji.name) &&
      !usersWhoClaimed.has(user.id)
    )
  }

  const collector = rewardMessage.createReactionCollector({
    filter,
    time: 60000, // 1 minute
  })

  collector.on('collect', async (reaction, user) => {
    usersWhoClaimed.add(user.id) // Mark user as having claimed

    const selectedEmojiIndex = emojis.indexOf(reaction.emoji.name)
    const selectedReward = rewards[selectedEmojiIndex]

    const userData = await User.findOne({ where: { user_id: user.id } })
    if (!userData) {
      console.error(`User with ID ${user.id} not found.`)
    } else {
      if (typeof selectedReward === 'number') {
        userData.gold += selectedReward
        await userData.save()
      } else if (selectedReward === 'gems') {
        userData.currency.gems += 10
        await userData.save({ fields: ['currency'] }) // Save only the currency JSON
      } else if (selectedReward) {
        await Collection.create({
          user_id: user.id,
          monster_id: selectedReward.id,
          quantity: 1,
        })
      }
    }

    const feedbackEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Congratulations!')
      .setDescription(
        `${user.username}, you've selected ${reaction.emoji.name} and won ${
          typeof selectedReward === 'number'
            ? `🪙 ${selectedReward} gold`
            : selectedReward === 'gems'
            ? '🧿 10 gems'
            : `the ${transformRarityIdentifier(
                selectedReward.rarity
              )} monster: **${selectedReward.name}**`
        }!`
      )

    await rewardMessage.edit({ content: ' ', embeds: [feedbackEmbed] })
    await rewardMessage.reactions.removeAll().catch(console.error)
  })

  collector.on('end', (collected) => {
    if (collected.size === 0) {
      console.log('No selections were made.')
    }
  })

  for (const emoji of emojis) {
    await rewardMessage.react(emoji)
  }
}

module.exports = { setupFreeRewardCollector }
