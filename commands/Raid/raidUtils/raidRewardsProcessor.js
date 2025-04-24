// raidRewardsProcessor.js
const { EmbedBuilder } = require('discord.js')
const { User } = require('../../../Models/model')
const { pullSpecificMonster } = require('../../../handlers/cacheHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/userMonsterHandler')
const {
  getUniformBaseRewards,
  getUniformCardRewards,
  getUniformGearReward,
} = require('../../../commands/Raid/raidUtils/raidRewards')

const { getStarsBasedOnColor } = require('../../../utils/starRating')
const {
  generateMonsterRewardEmbed,
} = require('../../../utils/embeds/monsterRewardEmbed')
const { classifyMonsterType } = require('../../Hunt/huntUtils/huntHelpers')

async function processGlobalRaidRewards(raidBoss, paidUsers) {
  // Convert hp values to numbers explicitly

  const totalHP = Number(raidBoss.hp)
  const currentHP = Number(raidBoss.current_hp)
  const raidProgressPercentage = 1 - currentHP / totalHP

  /* get contributors that reached ≥ 2 % */
  if (paidUsers.length === 0) {
    return {
      summaryEmbed: new EmbedBuilder()
        .setTitle('Raid Complete')
        .setDescription('No one met the 2 % damage requirement.'),
      monsterRewardEmbeds: [],
    }
  }

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
  let awardedCards = [] 
  let monsterRewardEmbeds = [] 

  // Loop through every participant
  for (const userId of paidUsers) {
    const user = await User.findByPk(userId)

    console.log(userId, 'global participants')
    if (!user) continue

    user.gold += baseRewards.gold
    console.log('before gear:', user.currency.gear)

    user.currency = {
      ...user.currency,
      gear: user.currency.gear + gearReward,
    }

    await user.setDataValue('currency', user.currency)
    await user.save()

    console.log(
      `[Rewards] For user ${userId}, new gear value: ${user.currency.gear}`
    )

    totalGold += baseRewards.gold
    totalGear += gearReward
    console.log('after gear:', user.currency.gear)

    for (const cardName of cardRewards) {
      const monster = await pullSpecificMonster(cardName)
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
