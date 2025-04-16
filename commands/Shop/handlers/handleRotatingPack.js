// Shop/handlers/handleRotatingPack.js

const { pullValidMonster } = require('../../../handlers/cacheHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/userMonsterHandler')
const { updateTop3AndUserScore } = require('../../../handlers/topCardsManager')
const {
  generateMonsterRewardEmbed,
} = require('../../../utils/embeds/monsterRewardEmbed')
const {
  classifyMonsterType,
} = require('../../../commands/Hunt/huntUtils/huntHelpers')
const { getStarsBasedOnColor } = require('../../../utils/starRating')

const PACK_SCHEDULE = [
  { type: 'elemental', days: [4, 5], cost: 7000 }, // Thursday, Friday
  { type: 'werefolk', days: [6, 0], cost: 8000 }, // Saturday, Sunday
  { type: 'monstrosity', days: [1, 2, 3], cost: 6000 }, // Monday, Tuesday, Wednesday
]
const TIER_OPTIONS = {
  common: { name: 'Common' },
  uncommon: { name: 'Uncommon' },
  rare: { name: 'Rare' },
  elemental: {
    customTiers: [
      { name: 'Uncommon', chance: 0.98 },
      { name: 'Rare', chance: 0.02 },
    ],
  },
  werefolk: {
    customTiers: [
      { name: 'Common', chance: 0.38 },
      { name: 'Uncommon', chance: 0.68 },
      { name: 'Rare', chance: 0.02 },
    ],
  },
  monstrosity: {
    customTiers: [
      { name: 'Uncommon', chance: 0.98 },
      { name: 'Rare', chance: 0.02 },
    ],
  },
}

function getCurrentPack() {
  const now = new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()
  // Handle packs before 6 AM as previous day's pack
  const effectiveDay = currentHour < 6 ? (currentDay + 6) % 7 : currentDay
  return PACK_SCHEDULE.find((pack) => pack.days.includes(effectiveDay))
}

async function handleRotatingPack(interaction, user) {
  const currentPack = getCurrentPack()

  if (!currentPack) {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({
        content: 'No special packs are available at this time.',
        ephemeral: true,
      })
    } else {
      return interaction.reply({
        content: 'No special packs are available at this time.',
        ephemeral: true,
      })
    }
  }

  if (user.gold < currentPack.cost) {
    const msg = {
      content: `You don't have enough gold for the ${currentPack.type} pack. Required: 🪙${currentPack.cost}, Available: 🪙${user.gold}`,
      ephemeral: true,
    }
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(msg)
    } else {
      return interaction.reply(msg)
    }
  }

  user.gold -= currentPack.cost
  await user.save()

  const monster = await pullValidMonster(
    TIER_OPTIONS[currentPack.type.toLowerCase()],
    currentPack.type.toLowerCase(),
    user.user_id
  )

  if (!monster) {
    const msg = {
      content: `No monsters are currently available in the ${currentPack.type} pack. Please try again later.`,
      ephemeral: true,
    }
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply(msg)
    } else {
      return interaction.reply(msg)
    }
  }

  await updateOrAddMonsterToCollection(user.user_id, monster)
  await updateTop3AndUserScore(user.user_id)

  const category = classifyMonsterType(monster.type)
  const stars = getStarsBasedOnColor(monster.color)
  const monsterEmbed = generateMonsterRewardEmbed(monster, category, stars)

  const successMsg = {
    content: `${interaction.user.username} pulled a new ${monster.name} from the ${currentPack.type} pack!`,
    embeds: [monsterEmbed],
    ephemeral: false,
  }

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: 'Pack purchased!', embeds: [] })
    await interaction.followUp(successMsg)
  } else {
    await interaction.reply(successMsg)
  }
}

module.exports = { handleRotatingPack }
