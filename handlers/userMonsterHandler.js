// monsterhandler.js

const { Collection, User } = require('../Models/model')

const mScoreMultipliers = {
  Common: {
    1: 1.2,
    2: 1.4,
    3: 1.6,
    4: 1.8,
    5: 2.0,
    6: 2.2,
    7: 2.4,
    8: 2.6,
    9: 2.8,
    10: 3.0,
  },
  Uncommon: {
    1: 1.15,
    2: 1.3,
    3: 1.5,
    4: 1.75,
    5: 2.0,
    6: 2.25,
    7: 2.5,
    8: 3.0,
    9: 3.75,
    10: 4.5,
  },
  Rare: {
    1: 1.1,
    2: 1.25,
    3: 1.4,
    4: 1.6,
    5: 2.0,
    6: 2.4,
    7: 2.8,
    8: 3.5,
    9: 4.25,
    10: 5.0,
  },
  'Very Rare': {
    1: 1.1,
    2: 1.2,
    3: 1.3,
    4: 1.5,
    5: 2.25,
    6: 2.75,
    7: 3.25,
    8: 4.0,
    9: 5.0,
    10: 6.0,
  },
  Legendary: {
    1: 1.05,
    2: 1.15,
    3: 1.25,
    4: 1.4,
    5: 2.5,
    6: 3.25,
    7: 4.0,
    8: 5.0,
    9: 6.0,
    10: 7.0,
  },
}

function calculateMScore(cr, rarity, level) {
  const adjustedCR = cr < 1 ? 1 : cr
  const multiplier = mScoreMultipliers[rarity][level] || 1
  return Math.round(adjustedCR * multiplier * 10)
}

function determineCategory(type) {
  const bruteTypes = new Set([
    'construct',
    'dragon',
    'giant',
    'humanoid',
    'monstrosity',
  ])
  const spellswordTypes = new Set([
    'aberration',
    'celestial',
    'elemental',
    'fey',
    'fiend',
  ])
  const stealthTypes = new Set(['plant', 'ooze', 'beast', 'undead'])

  if (bruteTypes.has(type.toLowerCase())) return 'brute'
  if (spellswordTypes.has(type.toLowerCase())) return 'spellsword'
  if (stealthTypes.has(type.toLowerCase())) return 'stealth'
  return null
}

async function updateUserScores(userId, category, monster) {
  const user = await User.findByPk(userId)
  if (!user) return

  console.log(`Processing user ${userId} for category ${category}.`)
  console.log(
    `Monster received for update: ID=${monster.id}, m_score=${monster.m_score}`
  )

  const topCategoryField = `top_${category}s` // e.g., top_brutes
  const categoryScoreField = `${category}_score` // e.g., brute_score

  // Retrieve current top monsters (IDs only) and top category list (IDs only)
  const currentTopMonsters = user.top_monsters || []
  const currentTopCategory = user[topCategoryField] || []

  console.log(`Current top_monsters: ${JSON.stringify(currentTopMonsters)}`)
  console.log(
    `Current ${topCategoryField}: ${JSON.stringify(currentTopCategory)}`
  )

  // Update top monsters with unique IDs, keeping only the top 3 by m_score across all categories
  const updatedTopMonsters = Array.from(
    new Set([...currentTopMonsters, monster.id])
  )

  // Fetch m_scores directly from the Collection to ensure accurate values
  const topMonsterScores = await Collection.findAll({
    where: { id: updatedTopMonsters },
    attributes: ['id', 'm_score'],
  })

  const sortedTopMonsters = topMonsterScores
    .sort((a, b) => b.m_score - a.m_score)
    .slice(0, 3)
    .map((m) => m.id) // Extract only IDs

  console.log(
    `Updated top_monsters after adding new monster: ${JSON.stringify(
      sortedTopMonsters
    )}`
  )

  // For updatedTopCategory, include only IDs for monsters of the specified category (brute, spellsword, etc.)
  const updatedTopCategory = Array.from(
    new Set([...currentTopCategory, monster.id])
  )

  const topCategoryScores = await Collection.findAll({
    where: { id: updatedTopCategory },
    attributes: ['id', 'm_score'],
  })

  const sortedTopCategory = topCategoryScores
    .sort((a, b) => b.m_score - a.m_score)
    .slice(0, 3)
    .map((m) => m.id) // Extract only IDs

  console.log(
    `Updated ${topCategoryField} after sorting and trimming: ${JSON.stringify(
      sortedTopCategory
    )}`
  )

  // Calculate the updated category score based on m_scores in updatedTopCategory
  const updatedClassScoreValue = topCategoryScores
    .filter((entry) => sortedTopCategory.includes(entry.id))
    .reduce((total, entry) => {
      console.log(
        `Adding m_score ${entry.m_score} for monster ID=${entry.id} to ${category} score.`
      )
      return total + entry.m_score
    }, 0)

  console.log(
    `Final calculated ${categoryScoreField} for user ${userId}: ${updatedClassScoreValue}`
  )

  // Calculate the new total score across top monsters
  const newTotalScore = topMonsterScores
    .filter((entry) => sortedTopMonsters.includes(entry.id))
    .reduce((total, entry) => {
      console.log(
        `Adding m_score ${entry.m_score} for monster ID=${entry.id} to total score.`
      )
      return total + entry.m_score
    }, 0)

  console.log(`Calculated new total score for user ${userId}: ${newTotalScore}`)

  // Update the User table with the calculated results
  await user.update({
    top_monsters: sortedTopMonsters,
    [topCategoryField]: sortedTopCategory,
    [categoryScoreField]: updatedClassScoreValue,
    score: newTotalScore,
  })

  console.log(`Updated user ${userId} data with new scores and top monsters.`)
}

async function updateOrAddMonsterToCollection(userId, monster) {
  let collectionEntry = await Collection.findOne({
    where: { userId, name: monster.name },
  })
  const category = determineCategory(monster.type)

  if (collectionEntry) {
    collectionEntry.copies += 1
    if (collectionEntry.copies >= 1) {
      collectionEntry.level += 1
      collectionEntry.copies = 0
      collectionEntry.m_score = calculateMScore(
        monster.cr,
        monster.rarity,
        collectionEntry.level
      )
    }

    await collectionEntry.save()

    if (category) await updateUserScores(userId, category, collectionEntry)
  } else {
    const initialMScore = calculateMScore(monster.cr, monster.rarity, 1)
    collectionEntry = await Collection.create({
      userId,
      name: monster.name,
      type: monster.type,
      cr: monster.cr,
      m_score: initialMScore,
      level: 1,
      copies: 0,
    })

    if (category) await updateUserScores(userId, category, collectionEntry)
  }
}

module.exports = { determineCategory, updateOrAddMonsterToCollection }
