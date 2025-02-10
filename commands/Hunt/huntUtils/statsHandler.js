const { MonsterStats } = require('../../../Models/model.js')

// Ensure the table exists
async function initializeMonsterStats() {
  await MonsterStats.sync()
}

// Fetch monster stats by index
async function getMonsterStats(monsterIndex) {
  return await MonsterStats.findOne({ where: { monster_index: monsterIndex } })
}

// Increment wins/losses
async function updateMonsterStats(monsterIndex, monsterName, won, pageNumber, huntNumber, battleNumber) {
    const pageHuntBattle = `${pageNumber}-${huntNumber}-${battleNumber}` // Format: "Page-Hunt-Battle"
    
    let monster = await MonsterStats.findOne({
      where: { monster_index: monsterIndex, pageHunt: pageHuntBattle },
    });
  
    // Create a new entry if no record exists for this exact encounter
    if (!monster) {
      monster = await MonsterStats.create({
        monster_index: monsterIndex,
        monster_name: monsterName,
        pageHunt: pageHuntBattle,
      });
    }
  
    // Update win/loss count
    if (won) {
      monster.wins += 1;
    } else {
      monster.losses += 1;
    }
  
    await monster.save();
  }
  

module.exports = { initializeMonsterStats, updateMonsterStats }
