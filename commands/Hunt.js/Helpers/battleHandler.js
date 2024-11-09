// // ./Helpers/battleHandler.js

// const { EmbedBuilder } = require('discord.js')
// const {
//   createHealthBar,
//   calculateWinChance,
//   calculateReward,
//   addGoldToUser,
// } = require('../../utils/huntUtility/huntUtils.js')

// function calculateMonsterScore(monster) {
//   let score = monster.hit_points + 10
//   return score < 10 ? 10 : score
// }

// function getPlayerRoll(effectivePlayerScore, ichorUsed) {
//   if (ichorUsed) {
//     const minRoll = 0.4 * effectivePlayerScore
//     return Math.random() * (effectivePlayerScore - minRoll) + minRoll
//   } else {
//     return Math.random() * effectivePlayerScore
//   }
// }

// function getMonsterRoll(monsterScore, isMiniBoss) {
//   if (isMiniBoss) {
//     const minMonsterRoll = 0.2 * monsterScore
//     return Math.random() * (monsterScore - minMonsterRoll) + minMonsterRoll
//   } else {
//     return Math.random() * monsterScore
//   }
// }

// function updateMomentum(momentum, playerWins, playerRoll, monsterRoll) {
//   let segmentLoss = 0
//   const margin = playerRoll - monsterRoll

//   if (margin > 15) segmentLoss = 3
//   else if (margin > 5) segmentLoss = 2
//   else segmentLoss = 1

//   segmentLoss += playerWins

//   momentum -= segmentLoss
//   return momentum < 0 ? 0 : momentum
// }

// function buildPhaseEmbed(
//   phase,
//   monster,
//   playerScore,
//   monsterScore,
//   playerRoll,
//   monsterRoll,
//   momentum,
//   maxMomentum,
//   isAdvantaged,
//   ichorUsed,
//   imageUrl
// ) {
//   const healthBar = createHealthBar(momentum, maxMomentum)
//   const winChancePercentage = ichorUsed
//     ? 70
//     : calculateWinChance(playerScore, monsterScore, isAdvantaged).base
//   const winChanceText = `**Chance of Winning:** ${Math.floor(
//     winChancePercentage
//   )}%${isAdvantaged ? ' (Advantage)' : ''}`

//   return new EmbedBuilder()
//     .setTitle(`Phase ${phase} - Battle with ${monster.name}`)
//     .setDescription(
//       `**CR:** ${monster.challenge_rating}\n` +
//         `**Player Score:** ${Math.floor(playerScore)}\n` +
//         `**Enemy Score:** ${Math.floor(monsterScore)}\n` +
//         `${winChanceText}\n` +
//         `**Phase ${phase}**\n${phaseResult} Player rolled ${Math.floor(
//           playerRoll.toFixed(2)
//         )}, Monster rolled ${Math.floor(monsterRoll.toFixed(2))}\n\n` +
//         `${healthBar}`
//     )
//     .setColor('#FF4500')
//     .setThumbnail(imageUrl)
// }

// module.exports = { runBattlePhases, calculateMonsterScore, getPlayerRoll, }
