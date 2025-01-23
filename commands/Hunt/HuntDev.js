// const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
// const { Collection } = require('../../Models/model.js')

// const { checkUserAccount } = require('../Account/checkAccount.js')
// const { cacheHuntMonsters } = require('../../handlers/huntCacheHandler.js')
// const { showLevelSelection } = require('./huntUtils/huntHandlers.js')
// const { handlePagination } = require('./huntUtils/paginationHandler.js')

// module.exports = {
//   data: new SlashCommandBuilder()
//     .setName('hunt')
//     .setDescription(
//       'Embark on a hunt and engage in combat with a series of monsters'
//     ),

//   async execute(interaction) {
//     console.log(
//       `Hunt command executed by: ${interaction.user.tag} (ID: ${interaction.user.id})`
//     )

//     await interaction.deferReply({ ephemeral: true })

//     console.log('Checking user account...')
//     const user = await checkUserAccount(interaction)
//     if (!user) {
//       console.warn('User does not have an account.')
//       return
//     }

//     console.log('Initializing user hunt state...')
//     user.unlockedPages = user.unlockedPages || ['page1']
//     user.unlockedPage = user.unlockedPage || 'page1'
//     user.completedHunts = user.completedHunts || []

//     try {
//       console.log('Fetching user monster collection...')
//       const userCollection = await Collection.findOne({
//         where: { userId: interaction.user.id },
//       })

//       if (!userCollection) {
//         console.warn('No monster collection found for user.')
//         return interaction.editReply({
//           embeds: [
//             new EmbedBuilder()
//               .setColor('#FF0000')
//               .setTitle('No Monsters Found')
//               .setDescription(
//                 'You need at least one card to go on a hunt.\nUse `/shop` to receive a starter pack.'
//               ),
//           ],
//         })
//       }
//     } catch (error) {
//       console.error('Error querying Collection model:', error)
//       return interaction.editReply({
//         content: 'Error accessing collection data.',
//         ephemeral: true,
//       })
//     }

//     console.log('Displaying loading message...')
//     const loadingEmbed = new EmbedBuilder()
//       .setColor(0xffcc00)
//       .setDescription('Loading hunt data, please wait...')
//     await interaction.editReply({ embeds: [loadingEmbed] })

//     console.log('Caching hunt monsters...')
//     await cacheHuntMonsters()

//     console.log('Initializing hunt data...')
//     let huntData = {
//       totalMonstersDefeated: 0,
//       totalGoldEarned: 0,
//       currentBattleIndex: 0,
//       ichorUsed: false,
//       level: null,
//       retries: 0,
//       lastMonster: null,
//       inProgress: false,
//     }

//     console.log('Calling showLevelSelection()...')
//     await showLevelSelection(interaction, user, huntData)

//     console.log('Setting up message component collector...')
//     const filter = (i) => i.user.id === interaction.user.id
//     const collector = interaction.channel.createMessageComponentCollector({
//       filter,
//       time: 60000,
//     })

//     collector.on('collect', async (i) => {
//       console.log(`Collector received interaction: ${i.customId}`)

//       // Ignore hunt_select since it is handled inside showLevelSelection()
//       if (
//         i.customId === 'hunt_select' ||
//         i.customId === 'use_ichor' ||
//         i.customId === 'cancel_hunt'
//       ) {
//         console.log(
//           `Ignoring interaction ${i.customId} as it's already handled.`
//         )
//         return
//       }

//       try {
//         await i.deferUpdate()
//       } catch (error) {
//         console.error('Error deferring interaction:', error)
//         return
//       }

//       if (
//         i.customId.startsWith('prev_page_') ||
//         i.customId.startsWith('next_page_')
//       ) {
//         console.log(`Handling pagination for: ${i.customId}`)
//         await handlePagination(i, user)
//       }
//     })

//     collector.on('end', (collected, reason) => {
//       console.log(
//         `Collector ended. Reason: ${reason}. Interactions collected: ${collected.size}`
//       )
//     })
//   },
// }
