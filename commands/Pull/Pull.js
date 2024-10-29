const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const fs = require('fs')
const path = require('path')

// Read all filenames in the assets folder to create validCreatures set
const assetsPath = path.join(__dirname, '..', '..', 'assets')
const creatureFiles = fs.readdirSync(assetsPath)
const validCreatures = new Set(
  creatureFiles.map((filename) => path.parse(filename).name)
)

const monsterCacheByTier = {
  Common: [],
  Uncommon: [],
  Rare: [],
  'Very Rare': [],
  Legendary: [],
}

let cachePopulated = false // Cache status flag

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pull')
    .setDescription('Pulls a random monster card with tier-based rarity'),

  async execute(interaction) {
    await interaction.deferReply()

    const fetch = (await import('node-fetch')).default

    const tiers = [
      { name: 'Common', crRange: [0, 4], color: 0x808080, chance: 0.5 },
      { name: 'Uncommon', crRange: [5, 10], color: 0x00ff00, chance: 0.3 },
      { name: 'Rare', crRange: [11, 15], color: 0x0000ff, chance: 0.17 },
      { name: 'Very Rare', crRange: [16, 19], color: 0x800080, chance: 0.05 },
      {
        name: 'Legendary',
        crRange: [20, Infinity],
        color: 0xffd700,
        chance: 0.02,
      },
    ]

    async function cacheMonstersByTier() {
      if (cachePopulated) {
        console.log('Using cached monsters by tier.')
        return
      }

      console.log('Fetching monster list from API and categorizing by tier...')
      const response = await fetch('https://www.dnd5eapi.co/api/monsters')
      const data = await response.json()

      for (const monster of data.results) {
        try {
          if (!validCreatures.has(monster.index)) continue

          const detailResponse = await fetch(
            `https://www.dnd5eapi.co/api/monsters/${monster.index}`
          )
          const monsterDetails = await detailResponse.json()

          let cr = monsterDetails.challenge_rating
          if (typeof cr === 'string' && cr.includes('/')) {
            const [numerator, denominator] = cr.split('/').map(Number)
            cr = numerator / denominator
          }

          if (cr === undefined || cr === null) {
            console.log(`Skipping ${monsterDetails.name} due to invalid CR.`)
            continue
          }

          const imageUrl = `https://raw.githubusercontent.com/theoperatore/dnd-monster-api/master/src/db/assets/${monster.index}.jpg`

          const matchingTier = tiers.find(
            (tier) => cr >= tier.crRange[0] && cr <= tier.crRange[1]
          )
          if (matchingTier && monsterCacheByTier[matchingTier.name]) {
            monsterCacheByTier[matchingTier.name].push({
              name: monsterDetails.name,
              cr,
              imageUrl,
              color: matchingTier.color,
            })
          } else {
            console.log(
              `No matching tier found for ${monsterDetails.name} with CR ${cr}`
            )
          }
        } catch (error) {
          console.log(`Error processing monster ${monster.name}:`, error)
        }
      }
      cachePopulated = true // Set flag after cache is populated
      console.log('Monsters categorized by tier and cached.')
    }

    function selectTier() {
      const roll = Math.random()
      let cumulative = 0

      for (const tier of tiers) {
        cumulative += tier.chance
        if (roll < cumulative) {
          console.log(
            `Selected Tier: ${tier.name} with CR range ${tier.crRange[0]} - ${tier.crRange[1]}`
          )
          return tier
        }
      }
      return tiers[0]
    }

    async function pullValidMonster(tier, maxAttempts = 10) {
      let attempts = 0
      let monster

      do {
        const eligibleMonsters = monsterCacheByTier[tier.name]
        monster =
          eligibleMonsters[Math.floor(Math.random() * eligibleMonsters.length)]

        attempts++
        if (!monster || !monster.imageUrl.includes('githubusercontent.com')) {
          console.log(
            `Attempt ${attempts}: Invalid monster selected, retrying...`
          )
          monster = null
        }
      } while (!monster && attempts < maxAttempts)

      if (!monster) {
        console.log('Max attempts reached. No valid monster found.')
      }
      return monster
    }

    await cacheMonstersByTier()

    let monster
    let retries = 0
    const maxRetries = 5

    do {
      const selectedTier = selectTier()
      monster = await pullValidMonster(selectedTier)
      retries++
    } while (!monster && retries < maxRetries)

    if (monster) {
      const embed = new EmbedBuilder()
        .setColor(monster.color)
        .setTitle(monster.name)
        .setDescription(`**Challenge Rating:** ${monster.cr}`)
        .setThumbnail(monster.imageUrl)

      await interaction.editReply({ embeds: [embed] })
    } else {
      await interaction.editReply(
        'Could not retrieve a valid monster. Please try again later.'
      )
    }
  },
}
