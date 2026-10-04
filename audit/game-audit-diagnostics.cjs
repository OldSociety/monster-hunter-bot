/* Read-only audit: no bot login, ORM writes, timers, or network calls.
 * Run: node --preserve-symlinks --preserve-symlinks-main audit/game-audit-diagnostics.cjs
 */
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
const read = p => fs.readFileSync(path.join(root, p), 'utf8')
const quiet = { log() {}, warn() {}, error() {} }
function isolated(p, mocks = {}, suffix = '') {
  const module = { exports: {} }
  const context = { module, exports: module.exports, console: quiet,
    __dirname: path.dirname(path.join(root, p)), Math: Object.create(Math),
    setTimeout: callback => { callback(); return 0 },
    setInterval: () => 0, clearInterval() {},
    require: name => name in mocks ? mocks[name] : require(name) }
  context.global = context
  vm.runInNewContext(read(p).replace(/^export /gm, '') + '\n' + suffix, context, { filename: p })
  return { exports: module.exports, context }
}
const helpers = isolated('commands/Hunt/huntUtils/huntHelpers.js').exports
const scoring = isolated('handlers/userMonsterHandler.js', {
  '../Models/model': {}, '../commands/Hunt/huntUtils/huntHelpers': helpers,
}).exports
const rewardMath = isolated('commands/Hunt/huntUtils/rewardMath.js', {},
  'module.exports = {bossGold, huntTotals, fightRewards}')
const build = isolated('commands/Hunt/buildPages.js', {
  './huntUtils/rewardMath.js': rewardMath.exports,
}).exports
const pages = Object.fromEntries(fs.readdirSync(path.join(root, 'commands/Hunt/Pages'))
  .filter(p => p.endsWith('.js')).sort().map(p => {
    const data = isolated('commands/Hunt/Pages/' + p).exports
    return [data.key, data]
  }))
build.buildAllPages(pages)
const report = { campaign: [], probability: [], probes: {}, database: {} }
for (const page of Object.values(pages)) {
  for (const h of page.hunts) {
    const repeat = h.battles.reduce((sum, b) => sum + (b.type === 'boss' ? Math.round(b.goldReward * 1.4) : b.goldReward), 0)
    const first = h.battles.reduce((sum, b) => {
      const g = b.firstGoldReward && ['mini-boss', 'boss'].includes(b.type) ? b.firstGoldReward : b.goldReward
      return sum + (b.type === 'boss' ? Math.round(g * 1.4) : g)
    }, 0)
    report.campaign.push({ page: page.key, id: h.id, name: h.name, energy: h.energyCost,
      fights: h.battles.length, declaredFights: h.totalBattles, targetGold: h.totalGold,
      repeatGold: repeat, firstGold: first, goldPerEnergy: +(repeat / h.energyCost).toFixed(2),
      tokenExpectation: +(h.battles.length * 4 / 3).toFixed(2),
      minEnemy: Math.min(...h.battles.map(b => +b.difficulty)),
      maxEnemy: Math.max(...h.battles.map(b => +b.difficulty)),
      bossEnemy: +h.battles.at(-1).difficulty })
  }
}
// Exact probability of rounded player >= integer monster for the implemented distributions.
function phaseChance(score, enemy, kind, advantage = 1, ichor = false, base = 0) {
  if (!score || !enemy) return 0
  const low = score * (ichor ? .30 : .15)
  const high = (score + base) * advantage
  const enemyLow = kind === 'boss' ? Math.ceil(enemy * .5) : kind === 'mini-boss' ? Math.ceil(enemy * .25) : 0
  let p = 0
  for (let roll = enemyLow; roll <= enemy; roll++) {
    p += Math.max(0, Math.min(1, (high - (roll - .5)) / (high - low)))
  }
  return p / (enemy - enemyLow + 1)
}
function matchChance(p) {
  return 35 * p ** 4 * (1 - p) ** 3 + 21 * p ** 5 * (1 - p) ** 2 + 7 * p ** 6 * (1 - p) + p ** 7
}
for (const kind of ['normal', 'mini-boss', 'boss']) {
  for (const ratio of [.75, 1, 1.25, 1.5, 2]) {
    const p = phaseChance(1000 * ratio, 1000, kind)
    report.probability.push({ kind, ratio, phaseWin: +p.toFixed(6), battleWin: +matchChance(p).toFixed(6),
      battleWinIchor: +matchChance(phaseChance(1000 * ratio, 1000, kind, 1, true)).toFixed(6) })
  }
}
report.probes.werefolk = { configuredTotal: .38 + .68 + .02,
  actualCommon: .38, actualUncommon: .62, actualRare: 0 }
report.probes.rankSeven = Object.fromEntries(['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary']
  .map(r => [r, scoring.calculateMScore(r === 'Common' ? 4 : r === 'Uncommon' ? 10 : r === 'Rare' ? 15 : r === 'Very Rare' ? 19 : 30, r, 7)]))
const participants = []
participants['123456789012345678'] = 42
report.probes.arrayParticipantSerialization = JSON.stringify(participants)
const dailyDays = [0, 1, 8, 9, 10, 79, 80, 1].map(streak => ({ streak,
  displayDay: (((streak || 1) - 1) % 10) + 1,
  awardedDay: ((streak + 1) % 80 || 80) % 10 || 10 }))
report.probes.dailyDays = dailyDays
const DB = require('better-sqlite3')
const db = new DB(path.join(root, 'config/dev.sqlite'), { readonly: true, fileMustExist: true })
const monsters = db.prepare('SELECT * FROM monsters').all()
const assets = new Set(fs.readdirSync(path.join(root, 'assets')).map(f => path.parse(f).name))
const cached = monsters.filter(m => assets.has(m.index))
const known = new Set(cached.map(m => m.index))
report.database.catalog = { total: monsters.length, withAsset: cached.length,
  byRarity: Object.fromEntries(['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary'].map(r => [r, cached.filter(m => m.rarity === r).length])),
  withArenaEffect: monsters.filter(m => m.arenaEffect).length,
  fractionalCR: monsters.filter(m => m.cr % 1).length }
report.database.missingCampaignMonsters = [...new Set(Object.values(pages).flatMap(p => p.hunts.flatMap(h => h.battles.map(b => b.monsterIndex))))].filter(i => !known.has(i))
report.database.duplicates = db.prepare('SELECT COUNT(*) AS n FROM (SELECT userId,name FROM Collections GROUP BY userId,name HAVING COUNT(*) > 1)').get().n
report.database.negativeCopies = db.prepare('SELECT COUNT(*) AS n FROM Collections WHERE copies < 0').get().n
report.database.aboveRankSeven = db.prepare('SELECT COUNT(*) AS n FROM Collections WHERE rank > 7').get().n
const users = db.prepare('SELECT user_id,score,brute_score,spellsword_score,stealth_score,top_monsters FROM Users').all()
const cards = db.prepare('SELECT userId,id,type,cr,rank,rarity,m_score FROM Collections').all()
report.database.incorrectCardScores = cards.filter(c => scoring.calculateMScore(c.cr,c.rarity,c.rank) !== c.m_score).length
report.database.userScoreMismatches = Object.fromEntries(['overall', 'brute', 'spellsword', 'stealth'].map(style => {
  let n = 0
  for (const u of users) {
    const list = cards.filter(c => c.userId === u.user_id && (style === 'overall' || helpers.classifyMonsterType(c.type) === style))
    const sum = list.sort((a,b) => b.m_score-a.m_score).slice(0,3).reduce((s,c) => s+c.m_score,0)
    if (u[style === 'overall' ? 'score' : style + '_score'] !== sum) n++
  }
  return [style,n]
}))
report.database.training = db.prepare('SELECT status,COUNT(*) AS n FROM TrainingSessions GROUP BY status').all()
report.database.multipleTrainingUsers = db.prepare("SELECT COUNT(*) AS n FROM (SELECT userId FROM TrainingSessions WHERE status='in-progress' GROUP BY userId HAVING COUNT(*) > 1)").get().n
report.database.raids = db.prepare('SELECT name,hp,boss_score,current_hp,difficulty_stage,active,participants FROM RaidBoss').all().map(r => {
  let p
  try { p = JSON.parse(r.participants) } catch { p = null }
  return { name:r.name,hp:r.hp,bossScore:r.boss_score,currentHp:r.current_hp,stage:r.difficulty_stage,active:r.active,
    participantsShape:Array.isArray(p)?'array':typeof p,participantCount:p?Object.keys(p).length:0 }
})
report.database.migrationHistory = { recorded: db.prepare('SELECT COUNT(*) AS n FROM SequelizeMeta').get().n,
  missingFiles: db.prepare('SELECT name FROM SequelizeMeta').all().map(x=>x.name)
    .filter(n => !fs.existsSync(path.join(root,'migrations',n))) }
const allowed = isolated('utils/shopMonsters.js').exports.allowedMonstersByPack
report.database.rarityDisagreements = cached.filter(m => {
  const expected=m.cr>=20?'Legendary':m.cr>=16?'Very Rare':m.cr>=11?'Rare':m.cr>=5?'Uncommon':'Common'
  return expected!==m.rarity
}).map(m=>({index:m.index,cr:m.cr,rarity:m.rarity}))
report.probes.packActualOdds = {}
const obtainable=new Set()
for (const [pack,set] of Object.entries(allowed)) {
  const entries=[...set]
  const tiers = pack==='starter'?['Common']:pack==='common'?['Common']:pack==='uncommon'?['Uncommon']:pack==='rare'?['Rare']:pack==='werefolk'?['Common','Uncommon']:['Uncommon','Rare']
  for (const tier of tiers) {
    const pool=cached.filter(m=>m.rarity===tier && entries.some(e=>e.monster===m.index))
    const explicit=entries.filter(e=>e.chance!=null && pool.some(m=>m.index===e.monster))
    const remaining=(1-explicit.reduce((s,e)=>s+e.chance,0))/(pool.length-explicit.length)
    const weights=pool.map(m=>({index:m.index,weight:(entries.find(e=>e.monster===m.index).chance??remaining)/(m.cr+1)}))
    const total=weights.reduce((s,w)=>s+w.weight,0)
    report.probes.packActualOdds[pack+'/'+tier]=weights.map(w=>({index:w.index,chance:+(w.weight/total).toFixed(6)}))
    if(pack!=='starter')pool.forEach(m=>obtainable.add(m.index))
  }
}
cached.filter(m=>m.type==='beast').forEach(m=>obtainable.add(m.index))
for(const index of ['lemure','nightmare','barbed-devil','bone-devil','horned-devil','erinyes','rakshasa','marilith','pit-fiend',
  'blue-dragon-wyrmling','young-blue-dragon','adult-blue-dragon','green-dragon-wyrmling','young-green-dragon','adult-green-dragon','red-dragon-wyrmling','young-red-dragon','adult-red-dragon'])obtainable.add(index)
db.prepare('SELECT "index",loot1,loot2,loot3 FROM RaidBoss').all().forEach(r=>Object.values(r).filter(Boolean).forEach(i=>obtainable.add(i)))
report.database.obtainabilityIgnoringRuntimeBugs={obtainable:cached.filter(m=>obtainable.has(m.index)).length,unobtainable:cached.filter(m=>!obtainable.has(m.index)).length}
report.database.packPool = Object.fromEntries(Object.entries(allowed).map(([name,set]) => [name,
  [...set].map(e => {const m=cached.find(m=>m.index===e.monster);return {index:e.monster,cr:m?.cr,rarity:m?.rarity,explicitChance:e.chance}})]))
report.probes.starterLookup = { suppliedType: typeof [...allowed.starter][0],
  found: cached.some(m => m.index === [...allowed.starter][0]) }
db.close()
console.log(JSON.stringify(report, null, 2))
