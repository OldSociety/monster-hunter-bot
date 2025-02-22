// raidRewardsProcessor.js
const { EmbedBuilder } = require('discord.js')
const { User } = require('../../../Models/model')
const { fetchMonsterByName } = require('../../../handlers/cacheHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/userMonsterHandler')
const {
  getUniformBaseRewards,
  getUniformCardRewards,
  getUniformGearReward,
} = require('../../../commands/Raid/raidUtils/raidRewards')

async function processGlobalRaidRewards(raidBoss, globalRaidParticipants) {
  // Convert hp values to numbers explicitly

  const totalHP = Number(raidBoss.hp)
  const currentHP = Number(raidBoss.current_hp)
  const raidProgressPercentage = 1 - currentHP / totalHP

  console.log('[Rewards] Boss HP:', totalHP, 'Current HP:', currentHP)
  console.log(
    '[Rewards] Computed raidProgressPercentage:',
    raidProgressPercentage
  )

  const baseRewards = getUniformBaseRewards(false, raidProgressPercentage)
  const gearReward = getUniformGearReward(false, raidProgressPercentage)
  const cardRewards = getUniformCardRewards(
    false,
    raidProgressPercentage,
    raidBoss
  )

  let totalGold = 0
  let totalGear = 0
  let awardedCards = [] // Will collect all card names awarded across users
  let monsterRewardEmbeds = [] // Collect individual monster reward embeds

  console.log(globalRaidParticipants)
  // Loop through every participant
  for (const userId of globalRaidParticipants) {
    const user = await User.findByPk(userId)

    console.log(userId, "global participants")
    if (!user) continue

    user.gold += baseRewards.gold
    user.currency.gear = (user.currency.gear || 0) + gearReward
    await user.save()

    totalGold += baseRewards.gold
    totalGear += gearReward

    for (const cardName of cardRewards) {
      const monster = await fetchMonsterByName(cardName)
      if (monster) {
        await updateOrAddMonsterToCollection(user.user_id, monster)
        const stars = getStarsBasedOnColor(monster.color)
        const category = classifyMonsterType(monster.type)
        const monsterEmbed = generateMonsterRewardEmbed(
          monster,
          category,
          stars
        )
        monsterRewardEmbeds.push(monsterEmbed)
        awardedCards.push(cardName)
      }
    }
    console.log(`[Rewards] Processed rewards for user ${userId}`)
  }

  globalRaidParticipants.clear()

  const summaryEmbed = new EmbedBuilder()
    .setTitle('🏆 Raid Complete.')
    .setDescription(
      `Raid progress was ${Math.round(raidProgressPercentage * 100)}%.\n\n` +
        `**Total Gold Awarded:** ${totalGold}\n` +
        `**Total Gear Awarded:** ${totalGear}\n` +
        `**Cards Awarded:** ${
          awardedCards.length > 0 ? awardedCards.join(', ') : 'None'
        }`
    )
    .setColor('Green')

  return { summaryEmbed, monsterRewardEmbeds }
}

module.exports = { processGlobalRaidRewards }
