// monsterHandler.js
const { Collection } = require('../Models/model') 

// Copies needed for each level
const copiesNeededPerLevel = {
  1: 3,
  2: 4,
  3: 4,
  4: 5,
  5: 6,
  6: 6,
  7: 7,
  8: 7,
  9: 8,
}

// m_score multipliers by rarity and level
const mScoreMultipliers = {
  Common: { 1: 1.2, 2: 1.4, 3: 1.6, 4: 1.8, 5: 2.0, 6: 2.2, 7: 2.4, 8: 2.6, 9: 2.8, 10: 3.0 },
  Uncommon: { 1: 1.15, 2: 1.3, 3: 1.5, 4: 1.75, 5: 2.0, 6: 2.25, 7: 2.5, 8: 3.0, 9: 3.75, 10: 4.5 },
  Rare: { 1: 1.1, 2: 1.25, 3: 1.4, 4: 1.6, 5: 2.0, 6: 2.4, 7: 2.8, 8: 3.5, 9: 4.25, 10: 5.0 },
  'Very Rare': { 1: 1.1, 2: 1.2, 3: 1.3, 4: 1.5, 5: 2.25, 6: 2.75, 7: 3.25, 8: 4.0, 9: 5.0, 10: 6.0 },
  Legendary: { 1: 1.05, 2: 1.15, 3: 1.25, 4: 1.4, 5: 2.5, 6: 3.25, 7: 4.0, 8: 5.0, 9: 6.0, 10: 7.0 },
}

// Function to calculate m_score based on CR, rarity, and level
function calculateMScore(cr, rarity, level) {
    const adjustedCR = cr < 1 ? 1 : cr;
  const multiplier = mScoreMultipliers[rarity][level] || 1
  return Math.round(adjustedCR * multiplier * 10);
}

// Access the copies needed for the next level up
function getCopiesNeededForNextLevel(level) {
    console.log(`Requested level: ${level}`)
    console.log(`Copies needed for level: ${copiesNeededPerLevel[level]}`)
    return copiesNeededPerLevel[level] || 50
  }
  

// Add or update a monster in the user's collection
async function updateOrAddMonsterToCollection(userId, monster) {
    // Find the collection entry if it exists
    let collectionEntry = await Collection.findOne({
      where: { userId, name: monster.name },
    })
  
    // Log retrieval of collection entry
    console.log(`Collection entry found: ${collectionEntry ? "Yes" : "No"}`);
  
    if (collectionEntry) {
      collectionEntry.copies += 1
      console.log(`Copies incremented. New copies count: ${collectionEntry.copies}`);
      console.log(getCopiesNeededForNextLevel(collectionEntry.level))
  
      // Loop to handle overflow leveling if copies exceed requirements
      while (collectionEntry.copies >= getCopiesNeededForNextLevel(collectionEntry.level)) {
        const copiesNeeded = getCopiesNeededForNextLevel(collectionEntry.level);
        console.log(`Level ${collectionEntry.level} requires ${copiesNeeded} copies.`);
  
        // Level up
        collectionEntry.level += 1
        collectionEntry.copies -= copiesNeeded
        console.log(`Leveled up! New level: ${collectionEntry.level}. Remaining copies: ${collectionEntry.copies}`);
  
        // Calculate and update m_score
        collectionEntry.m_score = calculateMScore(
          monster.cr,
          monster.rarity,
          collectionEntry.level
        )
        console.log(`m_score updated to ${collectionEntry.m_score}`);
      }
  
      // Attempt to save the updated collection entry
      try {
        await collectionEntry.save()
        console.log('Collection entry successfully saved.')
      } catch (error) {
        console.error('Error saving collection entry:', error);
      }
    } else {
      // If no entry exists, create a new one
      const initialMScore = calculateMScore(monster.cr, monster.rarity, 1)
      try {
        await Collection.create({
          userId,
          name: monster.name,
          type: monster.type,
          cr: monster.cr,
          m_score: initialMScore,
          level: 1,
          copies: 1,
        })
        console.log('New collection entry created.')
      } catch (error) {
        console.error('Error creating collection entry:', error)
      }
    }
  }
  

module.exports = {
  updateOrAddMonsterToCollection,
}
