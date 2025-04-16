// validateUserScores.js

const { Collection, User } = require('./Models/model')
const {
  classifyMonsterType,
} = require('./commands/Hunt/huntUtils/huntHelpers.js')

/**
 * Validates each user's scores by recalculating:
 *  - Overall top 3 monsters' m_score sum.
 *  - Top 3 monsters' m_score sum for each style (brute, spellsword, stealth).
 *
 * Logs detailed info when a mismatch is found.
 */
async function validateAllUserScores() {
  try {
    const users = await User.findAll()

    for (const user of users) {
      // Fetch all monsters for the user.
      const userMonsters = await Collection.findAll({
        where: { userId: user.user_id },
      })

      // Annotate each monster with its style.
      const monstersWithStyle = userMonsters.map((monster) => {
        const style = classifyMonsterType(monster.type)
        return { ...monster.dataValues, style }
      })

      // Log the full list of monsters for debugging.
      console.log(`\n[DEBUG] User ${user.user_id} monsters:`)
      monstersWithStyle.forEach((m) => {
        console.log(
          `   - ${m.name}: CR ${m.cr}, m_score ${m.m_score}, type ${m.type} (style ${m.style})`
        )
      })

      // Calculate overall top 3 score.
      const overallSorted = monstersWithStyle
        .slice()
        .sort((a, b) => b.cr - a.cr || b.m_score - a.m_score)
      const overallTop3 = overallSorted.slice(0, 3)
      const overallCalculatedScore = overallTop3.reduce(
        (acc, m) => acc + m.m_score,
        0
      )

      if (overallCalculatedScore !== user.score) {
        console.log(
          `\n[MISMATCH] User ${user.user_id} Overall Score: stored = ${user.score}, calculated = ${overallCalculatedScore}`
        )
        overallTop3.forEach((m, i) => {
          console.log(
            `     ${i + 1}. ${m.name} - CR: ${m.cr}, m_score: ${m.m_score}`
          )
        })
      }

      // Group monsters by style.
      const styleGroups = { brute: [], spellsword: [], stealth: [] }
      monstersWithStyle.forEach((monster) => {
        const style = styleGroups[monster.style] ? monster.style : 'brute'
        styleGroups[style].push(monster)
      })

      // Calculate score for each style.
      for (const style in styleGroups) {
        const sortedByStyle = styleGroups[style]
          .slice()
          .sort((a, b) => b.cr - a.cr || b.m_score - a.m_score)
        const top3ForStyle = sortedByStyle.slice(0, 3)
        const styleScore = top3ForStyle.reduce((acc, m) => acc + m.m_score, 0)
        const storedScore = user[`${style}_score`] || 0

        if (storedScore !== styleScore) {
          console.log(
            `\n[MISMATCH] User ${user.user_id} ${
              style.charAt(0).toUpperCase() + style.slice(1)
            } Score: stored = ${storedScore}, calculated = ${styleScore}`
          )
          console.log(`   Top 3 monsters for ${style}:`)
          top3ForStyle.forEach((m, i) => {
            console.log(
              `     ${i + 1}. ${m.name} - CR: ${m.cr}, m_score: ${m.m_score}`
            )
          })
        }
      }
    }
  } catch (error) {
    console.error('Error validating user scores:', error)
  }
}

if (require.main === module) {
  validateAllUserScores().then(() => {
    console.log('User score validation complete.')
    process.exit(0)
  })
}

module.exports = { validateAllUserScores }
