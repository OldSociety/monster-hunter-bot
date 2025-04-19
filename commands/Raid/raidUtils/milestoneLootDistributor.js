// milestoneLootDistributor.js
const { pullSpecificMonster } = require('../../../handlers/cacheHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/userMonsterHandler')
const { updateTop3AndUserScore } = require('../../../handlers/topCardsManager')
const { EmbedBuilder } = require('discord.js')

async function giveMilestoneCard(cardName, participantIds, client) {
  if (!cardName) return

  const monster = await pullSpecificMonster(cardName)
  if (!monster) return

  for (const userId of participantIds) {
    await updateOrAddMonsterToCollection(userId, monster)
    await updateTop3AndUserScore(userId)

    try {
      const embed = new EmbedBuilder()
        .setTitle('🃏 Raid Milestone Reward')
        .setDescription(`You obtained **${cardName}**`)
        .setColor('Purple')

      const user = await client.users.fetch(userId)
      await user.send({ embeds: [embed] })
    } catch (_) {
      /* no‑op */
    }
  }
}

module.exports = { giveMilestoneCard }
