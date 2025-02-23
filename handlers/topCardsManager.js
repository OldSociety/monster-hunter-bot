// handlers/topCardsManager.js
const { Collection, User } = require('../Models/model')

/**
 * Updates a user's top 3 cards based on CR and m_score.
 * @param {string} userId - The ID of the user.
 */
async function updateTop3AndUserScore(userId) {
  // Fetch all monsters for the user
  const userMonsters = await Collection.findAll({ where: { userId } })

  // Sort by CR and m_score to determine the top 3
  const top3Monsters = userMonsters
    .sort((a, b) => (b.cr - a.cr) || (b.m_score - a.m_score))
    .slice(0, 3)

  // Calculate total score based on top 3 m_scores
  const newScore = top3Monsters.reduce((acc, monster) => acc + monster.m_score, 0)

  // Get top 3 monster IDs
  const top3MonsterIds = top3Monsters.map(monster => monster.id)

  // Update the user's score and top 3 monsters in the Users table
  await User.update(
    { score: newScore, top_monsters: top3MonsterIds },
    { where: { user_id: userId } }
  )
}

module.exports = { updateTop3AndUserScore }
