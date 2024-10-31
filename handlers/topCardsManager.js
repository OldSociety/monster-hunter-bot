// handlers/topCardsManager.js
const { Collection, User } = require('../Models/model')

/**
 * Updates a user's top 5 cards based on CR and m_score.
 * @param {string} userId - The ID of the user.
 */
async function updateTop5AndUserScore(userId) {
  // Fetch all monsters for the user
  const userMonsters = await Collection.findAll({ where: { userId } })

  // Sort by CR and m_score to determine the top 5
  const top5Monsters = userMonsters
    .sort((a, b) => (b.cr - a.cr) || (b.m_score - a.m_score))
    .slice(0, 3)

  // Calculate total score based on top 5 m_scores
  const newScore = top5Monsters.reduce((acc, monster) => acc + monster.m_score, 0)

  // Get top 5 monster IDs
  const top5MonsterIds = top5Monsters.map(monster => monster.id)

  // Update the user's score and top 5 monsters in the Users table
  await User.update(
    { score: newScore, top_monsters: top5MonsterIds },
    { where: { user_id: userId } }
  )
}

module.exports = { updateTop5AndUserScore }
