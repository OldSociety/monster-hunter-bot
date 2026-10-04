// Isolated scenarios use fake users/collectors and an in-memory migration database.
// No Discord login, live timers, or existing database writes.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { EventEmitter } = require('node:events')
const discord = require('discord.js')
const root = path.resolve(__dirname, '..')
const quiet = { log() {}, warn() {}, error() {} }
function load(file, mocks, suffix='') {
  const module={exports:{}}
  const ctx={module,console:quiet,Math:Object.create(Math),
    require:n=>n==='discord.js'?discord:n in mocks?mocks[n]:{},
    setTimeout:cb=>{cb();return 0},setInterval:()=>0,clearInterval(){}}
  ctx.Math.random=()=>.5
  vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8')+'\n'+suffix,ctx)
  return module.exports
}
function user(extra={}) {
  return {user_id:'audit',gold:0,score:1000,base_damage:0,current_raidHp:1000,
    currency:{tokens:100,energy:15,eggs:0,ichor:0,gear:0},
    save:async()=>{},changed(){},...extra}
}
async function main() {
  const out={}
  const {User,Monster,RaidBoss}=require('../Models/model')
  const raidModel=RaidBoss.build({participants:{}})
  raidModel.changed('participants',false)
  const dmgMap=raidModel.participants;dmgMap.audit=50;raidModel.participants=dmgMap
  out.participantChangeDetected=raidModel.changed('participants')
  out.arenaEffectDeclaredInMonsterModel=!!Monster.rawAttributes.arenaEffect
  out.productionStorage=User.sequelize.options.storage
  const battle=load('commands/Hunt/huntUtils/battleHandler.js',{})
  out.baseOnlyStyleWins=await battle.runBattlePhases({followUp:async()=>{}},user({base_damage:100}),0,1,{name:'dummy',index:'dummy'},1,{ichorUsed:false},'normal')
  const arena=load('commands/Arena/Arena.js',{},'module.exports.applyCard=applyCard')
  const frozen={enemyHp:15,playerHp:10,shield:0}
  arena.applyCard({keyword:'freeze',val:1},frozen,{str:5,def:5,maxHp:10})
  out.freezeState=frozen
  const raid=load('commands/Raid/raidUtils/raidHandler.js',{
    '../../../handlers/cacheHandler':{pullSpecificMonster:async()=>({name:'dummy'})},
    '../../../handlers/userMonsterHandler':{updateOrAddMonsterToCollection:async()=>{}},
    '../../../handlers/topCardsManager':{updateTop3AndUserScore:async()=>{}},
  },'module.exports.runRaidBattlePhases=runRaidBattlePhases')
  let persistedHp=10
  const instance={participants:{},current_hp:10,difficulty_stage:1,
    save:async function(){persistedHp=this.current_hp},
    decrement:async function(_,opts){this.current_hp-=opts.by;persistedHp=this.current_hp},
    reload:async function(){this.current_hp=persistedHp}}
  const boss={name:'dummy',hp:10,current_hp:10,boss_score:1,difficulty_stage:1,instance}
  const won=await raid.runRaidBattlePhases({user:{id:'audit'},followUp:async()=>{}},user(),1000,boss,1,'brute')
  out.normalRaidKill={won,stage:instance.difficulty_stage,persistedHp,participants:instance.participants}
  const collectors=new Map();const created=[]
  class FakeCollector extends EventEmitter {
    stop(reason='user'){this.emit('end',[],reason)}
    async click(btn){for(const cb of this.listeners('collect'))await cb(btn)}
  }
  const slots=load('commands/Slots/Slots.js',{
    '../../Models/model.js':{User:{}},
    '../../utils/collectors':{collectors,stopUserCollector(){}},
  },'module.exports.startGame=startGame;module.exports.states=gameStates')
  const player=user()
  const interaction={user:{id:'audit'},deferred:true,replied:false,
    channel:{createMessageComponentCollector(){const c=new FakeCollector();created.push(c);return c}},
    editReply:async()=>{},deferUpdate:async()=>{}}
  await slots.startGame(interaction,player)
  slots.states.get('audit').totalGold=25
  await created[0].click({...interaction,customId:'stop_playing_audit'})
  out.slotsCashout={gold:player.gold,newCollectorsAfterCashout:created.length-1,remainingPot:slots.states.get('audit').totalGold}
  if(created.length>1){await created[1].click({...interaction,customId:'stop_playing_audit'});out.slotsCashout.goldAfterRepeatedAction=player.gold}
  const rewards=load('commands/Raid/raidUtils/raidRewardsProcessor.js',{
    '../../../Models/model':{User:{findByPk:async()=>user()}},
    '../../../commands/Raid/raidUtils/raidRewards':load('commands/Raid/raidUtils/raidRewards.js',{}),
  }).processGlobalRaidRewards
  try {await rewards({hp:100,current_hp:50,loot1:null,loot2:null,loot3:null},{audit:20})}
  catch(e){out.raidObjectPayoutError=e.message}
  const Sequelize=require('sequelize')
  const memoryDb=new Sequelize({dialect:'sqlite',storage:':memory:',logging:false})
  const qi=memoryDb.getQueryInterface()
  const applied=[]
  for(const file of fs.readdirSync(path.join(root,'migrations')).filter(f=>f.endsWith('.js')).sort()){
    try {const m=load('migrations/'+file,{});await m.up(qi,Sequelize);applied.push(file)}
    catch(e){out.cleanMigration={applied:applied.length,failingFile:file,error:e.message};break}
  }
  await memoryDb.close()
  console.log(JSON.stringify(out,null,2))
}
main().catch(e=>{console.error(e);process.exitCode=1})
