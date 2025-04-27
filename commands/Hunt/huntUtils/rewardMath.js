// utils/rewardMath.js  (ES module syntax)

/* ---------- page level ---------------------------------------- */
export function gPerEnergy(page) {
    if (page === 1) throw new Error('Page-1 uses fixed bossGold, no g(P).');
    return 250 * (page - 1) / (1 + 0.05 * (page - 2));
  }
  
  export function bossGold(page, bossEnergy) {
    if (page === 1) return 281;                 // <- your hard-coded page-1 boss
    return Math.round(gPerEnergy(page) * bossEnergy);
  }
  
  /* ---------- hunt level ---------------------------------------- */
  /**
   * @param prevBossTot  total gold of previous page boss
   * @param prevBossE    energy  "      "
   * @param currBossTot  total gold of current page boss
   * @param energyArr    energy costs of hunts on current page
   * @param alpha        shape parameter (default 2)
   * @returns number[]   total gold for each hunt (same length as energyArr)
   */
  export function huntTotals(
    prevBossTot,
    prevBossE,
    currBossTot,
    energyArr,
    alpha = 2
  ) {
    const gPrev = prevBossTot / prevBossE;        // per-energy baseline
    const gCurr = currBossTot / energyArr.at(-1); // per-energy target
  
    return energyArr.map((E, k) => {
      const f = Math.pow((k + 1) / energyArr.length, alpha);
      const p = gPrev + f * (gCurr - gPrev);      // per-energy for hunt k
      return Math.round(p * E);                   // total gold for hunt k
    });
  }
  
  /* ---------- fight level --------------------------------------- */
  export function fightRewards(totalGold, fightsBeforeBoss, bossFrac = 0.30) {
    const boss = Math.round(totalGold * bossFrac);
    const pre  = totalGold - boss;
    const M    = fightsBeforeBoss;
  
    const out  = [];
    let sum    = 0;
    for (let i = 1; i <= M; i++) {
      const r = Math.round(pre * (2 * i) / (M * (M + 1)));  // 1:2:…:M
      out.push(r);
      sum += r;
    }
    out[M - 1] -= sum - pre;   // correct rounding drift
    out.push(boss);            // final index = boss fight
    return out;
  }
  