const { User, Collection } = require('../Models/model')
const { classifyMonsterType } = require('../commands/Hunt/huntUtils/huntHelpers.js')

async function verifyAndUpdateUserScores(userId) {
  let user = await User.findOne({ where: { user_id: userId } })
  if (!user) return null

  // Fetch all monsters for the user.
  const monsters = await Collection.findAll({ where: { userId } })

  // Annotate each monster with its style based on its type.
  const monstersWithStyle = monsters.map((mon) => ({
    ...mon.dataValues,
    style: classifyMonsterType(mon.type),
  }))

  // Calculate overall top 3 score by sorting solely on m_score descending.
  const overallTop3 = monstersWithStyle
    .sort((a, b) => b.m_score - a.m_score)
    .slice(0, 3)
  const overallScore = overallTop3.reduce((acc, m) => acc + m.m_score, 0)

  // Group monsters by style.
  const styleGroups = { brute: [], spellsword: [], stealth: [] }
  monstersWithStyle.forEach((mon) => {
    const style = styleGroups[mon.style] !== undefined ? mon.style : 'brute'
    styleGroups[style].push(mon)
  })

  // For each style, sort solely on m_score descending, take top 3, and sum their scores.
  const bruteTop3 = styleGroups.brute
    .sort((a, b) => b.m_score - a.m_score)
    .slice(0, 3)
  const spellswordTop3 = styleGroups.spellsword
    .sort((a, b) => b.m_score - a.m_score)
    .slice(0, 3)
  const stealthTop3 = styleGroups.stealth
    .sort((a, b) => b.m_score - a.m_score)
    .slice(0, 3)

  const bruteScore = bruteTop3.reduce((acc, m) => acc + m.m_score, 0)
  const spellswordScore = spellswordTop3.reduce((acc, m) => acc + m.m_score, 0)
  const stealthScore = stealthTop3.reduce((acc, m) => acc + m.m_score, 0)

  let updated = false
  if (user.score !== overallScore) {
    user.score = overallScore
    user.top_monsters = overallTop3.map((mon) => mon.id)
    updated = true
  }
  if (user.brute_score !== bruteScore) {
    user.brute_score = bruteScore
    user.top_brutes = bruteTop3.map((mon) => mon.id)
    updated = true
  }
  if (user.spellsword_score !== spellswordScore) {
    user.spellsword_score = spellswordScore
    user.top_spellswords = spellswordTop3.map((mon) => mon.id)
    updated = true
  }
  if (user.stealth_score !== stealthScore) {
    user.stealth_score = stealthScore
    user.top_stealths = stealthTop3.map((mon) => mon.id)
    updated = true
  }

  if (updated) {
    await user.save()
    console.log(
      `[SCORE UPDATE] Updated user ${userId}: Overall=${overallScore}, Brute=${bruteScore}, Spellsword=${spellswordScore}, Stealth=${stealthScore}`
    )
  }
  return user
}

module.exports = { verifyAndUpdateUserScores }
