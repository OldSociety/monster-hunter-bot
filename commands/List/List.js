const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

let monsterListCache = [] // Cache for monster indices

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription(
      '(ADMIN)Lists the number of monsters by CR tier'
    ),

  async execute(interaction) {


    // Check if the executing user has the admin role
    if (!interaction.member.roles.cache.has(process.env.ADMINROLEID)) {
      return interaction.reply({
        content: 'You do not have permission to run this command.',
        ephemeral: true,
      })
    }
    await interaction.deferReply()

    // Dynamically import node-fetch
    const fetch = (await import('node-fetch')).default

    // Define CR tiers with initial counts
    const tiers = [
      { name: 'Tier 1', crRange: [1, 4], color: 0x808080, count: 0 }, // Grey
      { name: 'Tier 2', crRange: [5, 10], color: 0x00ff00, count: 0 }, // Green
      { name: 'Tier 3', crRange: [11, 15], color: 0x0000ff, count: 0 }, // Blue
      { name: 'Tier 4', crRange: [16, 19], color: 0x800080, count: 0 }, // Purple
      { name: 'Tier 5', crRange: [20, Infinity], color: 0xffd700, count: 0 }, // Gold
    ]

    async function cacheMonsterList() {
      if (monsterListCache.length === 0) {
        const response = await fetch('https://www.dnd5eapi.co/api/monsters')
        const data = await response.json()
        monsterListCache = data.results

        console.log('Fetched monster list:', monsterListCache) // Log fetched data
      }
    }

    async function processBatch(batchSize = 400) {
      const batch = monsterListCache.slice(0, batchSize) // Limit to first 25
      let processedCount = 0
    
      for (const monster of batch) {
        // console.log(`Processing monster: ${monster.name} | CR: ${monster.challenge_rating}`)
    
        // Fetch details if `challenge_rating` is missing or undefined
        if (monster.challenge_rating === undefined) {
          const detailResponse = await fetch(`https://www.dnd5eapi.co/api/monsters/${monster.index}`)
          const monsterDetails = await detailResponse.json()
          
          // Assign the fetched challenge rating or set it to 0 if still undefined
          monster.challenge_rating = monsterDetails.challenge_rating ?? 0
        }
    
        const cr = monster.challenge_rating
        if (cr === undefined || cr === null) {
          console.log(`Warning: Monster ${monster.name} has no challenge rating.`)
          continue
        }
    
        // Categorize by CR tier
        for (const tier of tiers) {
          if (cr >= tier.crRange[0] && cr <= tier.crRange[1]) {
            tier.count += 1
            break
          }
        }
        processedCount++
      }
      return processedCount
    }
    

    await cacheMonsterList()
    await processBatch() 
    // Create an embed to display the counts
    const embed = new EmbedBuilder()
      .setTitle('Monsters by CR Tier (First 25)')
      .setDescription('Number of monsters organized by Challenge Rating tiers.')
      .setColor(0x00bfff)
      .setFooter({ text: 'Data retrieved from D&D API' })

    tiers.forEach((tier) => {
      embed.addFields({
        name: `${tier.name} (CR ${tier.crRange[0]} - ${
          tier.crRange[1] === Infinity ? '20+' : tier.crRange[1]
        })`,
        value: `${tier.count} monsters`,
        inline: true,
      })
    })

    await interaction.editReply({ embeds: [embed] })
  },
}
