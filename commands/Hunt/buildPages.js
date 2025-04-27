// buildPages.js  (CommonJS)
const { bossGold, huntTotals, fightRewards } =
  require('./huntUtils/rewardMath.js');

function buildAllPages(huntPages) {

  // --------- initialise with PAGE-2 boss stats -----------------
  let prevBossTot    = 0   // 500 g
  let prevBossEnergy = 1;                // page-2 boss costs 2 energy
  // -------------------------------------------------------------

  for (const pageKey of Object.keys(huntPages).sort()) {
    const page     = huntPages[pageKey];
    const P        = Number(pageKey.replace('page', ''));   // 3,4,…
    let bossE = page.hunts.at(-1).energyCost;
if (bossE == null) {
  if (P === 1) bossE = 1;     // page-1 boss we said costs 1 energy
  else throw new Error(`Boss energyCost missing on ${pageKey}`);
}
console.log(
    `[${pageKey}] prevBossTot=${prevBossTot}, prevBossEnergy=${prevBossEnergy}`
  );
  
    const currBoss = bossGold(P, bossE);

    const energyArr = page.hunts.map(h => h.energyCost);
if (energyArr.some(e => e == null)) {
  console.error(`✖ energyCost missing in ${pageKey}`, energyArr);
}
    const huntTotalsG = huntTotals(
      prevBossTot,        // previous boss gold
      prevBossEnergy,     // previous boss energy
      currBoss,           // current boss gold
      energyArr
    );
    
console.log(`[${pageKey}] huntTotalsG`, huntTotalsG);
page.hunts.forEach((hunt, idx) => {
    hunt.totalGold = huntTotalsG[idx];
  
    // ── validate totalBattles ────────────────────────────────────
    if (!Number.isFinite(hunt.totalBattles) || hunt.totalBattles <= 1) {
      console.error(
        `✖ totalBattles invalid in ${pageKey}, hunt ${hunt.id}:`,
        hunt.totalBattles
      );
      return;                               // skip this hunt so we notice the bug
      // or: hunt.totalBattles = hunt.battles.length;  // quick auto-fix
    }
  
    const fightG = fightRewards(hunt.totalGold, hunt.totalBattles - 1);
    hunt.battles.forEach((b, i) => (b.goldReward = fightG[i]));
  });
  

    // update “previous” trackers for next loop
    prevBossTot    = currBoss;
    prevBossEnergy = bossE;
  }
}

module.exports = { buildAllPages };
