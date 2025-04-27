const { EmbedBuilder } = require('discord.js')

const { checkAdvantage } = require('../../Hunt/huntUtils/huntHelpers.js')

const { pullSpecificMonster } = require('../../../handlers/cacheHandler')
const {
  updateOrAddMonsterToCollection,
} = require('../../../handlers/userMonsterHandler')
const { updateTop3AndUserScore } = require('../../../handlers/topCardsManager')
// const {
//   generateMonsterRewardEmbed,
// } = require('../../../utils/embeds/monsterRewardEmbed')
// const { getStarsBasedOnColor } = require('../../../utils/starRating')

// const { classifyMonsterType } = require('../../Hunt/huntUtils/huntHelpers')

const { createHealthBar } = require('../../Hunt/huntUtils/battleHandler.js')
const { collectors, stopUserCollector } = require('../../../utils/collectors')
const { RaidBoss } = require('../../../Models/model.js')
const {
  raidBossRotation,
  enterCooldownEarly,
  getNextActiveTime,
} = require('../../../handlers/raidTimerHandler.js')
const {
  getUserFooter,
  createWelcomeEmbed,
  createRaidBossEmbed,
  createInitialActionRow,
  createUpdatedActionRow,
} = require('./raidHelpers.js')

const { formatTimeRemaining } = require('./timeUtils.js')
const { processGlobalRaidRewards } = require('./raidRewardsProcessor.js')

const { getUniformBaseRewards, getUniformGearReward } = require('./raidRewards')

let rewardsDistributed = false

async function runRaidBattlePhases(
  interaction,
  user,
  playerScore,
  raidBoss,
  advMultiplier,
  selectedStyle
) {
  console.log('[Battle] Starting Raid Battle Phases')

  let playerHP = user.current_raidHp
  let bossHP = raidBoss.current_hp
  const maxBossHP = raidBoss.hp
  const maxPlayerHP = user.score
  const imageUrl = raidBoss.imageUrl

  let phase = 0
  let damageDealt = 0

  while (bossHP > 0 && playerHP > 0) {
    phase += 1

    /* ---------- rolls ---------- */
    const playerRoll = Math.round(
      (Math.random() * 0.9 + 0.1) * playerScore * advMultiplier
    )

    const dmgMult = [1, 2, 3][raidBoss.difficulty_stage - 1]
    const monsterRoll = Math.round(
      (Math.random() * (raidBoss.boss_score * 0.5) +
        raidBoss.boss_score * 0.5) *
        dmgMult
    )

    const phaseResult = playerRoll >= monsterRoll ? 'Hit!' : 'Miss!'

    /* ---------- damage ---------- */
    if (phaseResult === 'Hit!') {
      const dmg = Math.round(playerRoll * 0.1)
      damageDealt += dmg

      const dmgMap = raidBoss.instance.participants
      dmgMap[interaction.user.id] = (dmgMap[interaction.user.id] || 0) + dmg
      raidBoss.instance.participants = dmgMap
      await raidBoss.instance.save({ fields: ['participants'] })

      await raidBoss.instance.decrement('current_hp', { by: dmg })
      await raidBoss.instance.reload()
      bossHP = raidBoss.instance.current_hp
    } else {
      const dmg = Math.round(monsterRoll * 0.1)
      playerHP -= dmg
    }

    bossHP = Math.max(0, bossHP)
    playerHP = Math.max(0, playerHP)

    /* ---------- victory ---------- */
    if (bossHP === 0) {
      const allCards = [
        raidBoss.loot1,
        raidBoss.loot2,
        raidBoss.loot3,
        raidBoss.index,
      ].filter(Boolean)

      for (const uid of Object.keys(raidBoss.instance.participants)) {
        for (const card of allCards) {
          const monster = await pullSpecificMonster(card)
          await updateOrAddMonsterToCollection(uid, monster)
        }
        await updateTop3AndUserScore(uid)
      }

      /* difficulty ladder */
      if (raidBoss.difficulty_stage < 3) {
        raidBoss.difficulty_stage += 1
        raidBoss.instance.difficulty_stage = raidBoss.difficulty_stage
        raidBoss.instance.current_hp = raidBoss.hp
        raidBoss.instance.participants = {}
        await raidBoss.instance.save()

        await interaction.followUp({
          content: `**${raidBoss.name} rises again in ${
            ['Hard', 'Nightmare'][raidBoss.difficulty_stage - 2]
          } mode!**  Damage multiplier is now ×${raidBoss.difficulty_stage}.`,
          ephemeral: false,
        })
      }
      break // leave loop after kill-handling
    }

    if (playerHP === 0) break

    /* ---------- embed per phase ---------- */
    const effects =
      advMultiplier > 1
        ? '⏫Advantage'
        : advMultiplier < 1
        ? '⏬Disadvantage'
        : 'None'

    const phaseEmbed = new EmbedBuilder()
      .setTitle(`Phase ${phase} – Fighting ${raidBoss.name}`)
      .setDescription(
        `**Your HP:** ${playerHP} / ${maxPlayerHP}\n${createHealthBar(
          playerHP,
          maxPlayerHP
        )}\n` +
          `**Boss HP:** ${bossHP} / ${maxBossHP}\n${createHealthBar(
            bossHP,
            maxBossHP
          )}\n\n` +
          `**Effects:** ${effects}\n` +
          `**Player Roll:** ${playerRoll}\n` +
          `**Boss Roll:** ${monsterRoll}\n\n` +
          `**Result:** ${phaseResult}\n` +
          (selectedStyle ? `**Style:** ${selectedStyle}\n` : '')
      )
      .setColor('#FF4500')
      .setImage(imageUrl)
      .setFooter({ text: getUserFooter(user) })

    await interaction.followUp({ embeds: [phaseEmbed], ephemeral: true })
    await new Promise((r) => setTimeout(r, 2000))
  }

  /* ---------- persist ---------- */
  user.current_raidHp = playerHP
  await user.save()
  raidBoss.instance.current_hp = bossHP
  await raidBoss.instance.save()

  return bossHP === 0
}

async function startRaidEncounter(interaction, user) {
  console.log('[Raid] Starting raid encounter')
  stopUserCollector(interaction.user.id)

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true })
  }

  rewardsDistributed = false
  const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] })
  console.log(`[Raid] Retrieved ${raidBosses.length} raid bosses.`)

  if (!raidBosses || raidBosses.length === 0) {
    console.log('[Raid] No valid raid bosses found.')
    return interaction.editReply({
      content: 'Error: No valid raid bosses found.',
      ephemeral: true,
    })
  }

  // Iterate in reverse to select the last active boss.
  let selectedBoss = null
  for (let i = raidBosses.length - 1; i >= 0; i--) {
    if (raidBosses[i].active === true) {
      selectedBoss = raidBosses[i]
      break
    }
  }
  if (!selectedBoss) {
    console.log('[Raid] No active raid boss found. Using default boss.')
    selectedBoss = raidBosses[0]
  } else {
    console.log('[Raid] Selected raid boss:', selectedBoss.name)
  }

  const raidBoss = {
    name: selectedBoss.name,
    index: selectedBoss.index,
    type: selectedBoss.type,
    combatType: selectedBoss.combatType,
    hp: selectedBoss.hp,
    current_hp: selectedBoss.current_hp,
    loot1: selectedBoss.loot1,
    loot2: selectedBoss.loot2,
    loot3: selectedBoss.loot3,
    boss_score: selectedBoss.boss_score,
    imageUrl: selectedBoss.imageUrl,
    difficulty_stage: selectedBoss.difficulty_stage,
    lootDrops: selectedBoss.lootDrops || [],
    activePhase: raidBossRotation.phase === 'active',
    instance: selectedBoss,
  }

  // If the raid is inactive (cooldown), show the rewards summary.
  if (raidBossRotation.phase !== 'active') {
    console.log(
      '[Raid] Raid is inactive (cooldown phase). Initiating end-of-raid procedure.'
    )
    const now = Date.now()
    const cooldownDuration = getNextActiveTime()
    const elapsed = now - raidBossRotation.lastSwitch
    const timeRemaining = Math.max(0, cooldownDuration - elapsed)

    if (Object.keys(selectedBoss.participants).length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🏆 Raid Complete.')
        .setDescription(
          `No one participated in this raid. No rewards were distributed.\n\nRaids will restart in \`${formatTimeRemaining(
            timeRemaining
          )}\``
        )
        .setColor('Gold')
      return interaction.editReply({ embeds: [embed], ephemeral: true })
    }

    const { getContributors } = require('./raidParticipants')
    const paidUsers = getContributors(raidBoss.instance)
    const { summaryEmbed, monsterRewardEmbeds } =
      await processGlobalRaidRewards(raidBoss, paidUsers)
    summaryEmbed.setTitle("This week's Raid is over.")
    console.log(
      '[Collector] Global rewards processed. Displaying summary embed.'
    )
    return interaction.editReply({
      embeds: [
        new EmbedBuilder(summaryEmbed.data)
          .setDescription(`This week's raid has finished.`)
          .setFooter({
            text: `Raids will restart in \`${formatTimeRemaining(
              timeRemaining
            )}\``,
          })
          .setColor('Gold'),
      ],
      ephemeral: true,
    })
  }

  // Send welcome embed for active raid.
  const welcomeEmbed = createWelcomeEmbed(raidBoss, user)
  console.log('[Raid] Overview embed created for active raid.')
  const initialRow = createInitialActionRow(user)
  console.log('[Raid] Initial action row created.')
  await interaction.editReply({
    embeds: [welcomeEmbed],
    components: [initialRow],
    ephemeral: true,
  })
  console.log('[Raid] Sent overview embed with initial action row.')

  // --- Start Collector with Renewal Logic ---
  function startCollector() {
    let lastInteractionTime = Date.now()

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    })

    const renewalInterval = setInterval(() => {
      if (Date.now() - lastInteractionTime >= 30000) {
        // console.log(
        //   `[Renew] No interaction for 30 seconds for user ${interaction.user.id}. Stopping collector.`
        // )
        collector.stop('timeout')
        lastInteractionTime = Date.now()
      }
    }, 1000)

    collector.on('collect', async (i) => {
      lastInteractionTime = Date.now()
      console.log('[Collector] Button pressed:', i.customId)

      if (i.customId === 'initiate_raid') {
        console.log('[Collector] Raid button clicked.')
        const updatedRow = createUpdatedActionRow(user)
        const updatedEmbed = createRaidBossEmbed(raidBoss, user)
        await i.update({
          embeds: [updatedEmbed],
          components: [updatedRow],
        })
        return
      }

      if (i.customId === 'heal') {
        console.log('[Collector] Heal button clicked.')
        await handleHealAction(i, user, raidBoss, 'one')
        return
      }

      if (i.customId === 'cancel_raid') {
        console.log('[Collector] Cancel raid button clicked.')
        await handleCancelRaid(i, user)
        return
      }

      if (i.customId.startsWith('raid_style_')) {
        // "raid_style_brute" -> split gives ["raid", "style", "brute"]
        const selectedStyle = i.customId.split('_')[2]
        console.log('[Collector] Style selected:', selectedStyle)
        const playerScore =
          (user[`${selectedStyle}_score`] || 0) + (user.base_damage || 0)
        const advMultiplier = Math.max(
          checkAdvantage(selectedStyle, raidBoss.type),
          1
        )
        await i.deferUpdate()

        console.log('[Collector] Starting raid battle phases.')
        if (!user.current_raidHp || user.current_raidHp <= 0) {
          user.current_raidHp = user.score
        }

        const playerWins = await runRaidBattlePhases(
          i,
          user,
          playerScore,
          raidBoss,
          advMultiplier,
          selectedStyle
        )
        console.log(
          '[Collector] Raid Battle phases complete. Outcome:',
          playerWins ? 'Victory' : 'Defeat'
        )

        if (!rewardsDistributed) {
          if (raidBossRotation.phase !== 'active') {
            rewardsDistributed = true
            console.log(
              '[Collector] Raid is no longer active. Processing global rewards.'
            )

            const { summaryEmbed, monsterRewardEmbeds } =
              await processGlobalRaidRewards(
                raidBoss,
                raidBoss.instance.participants
              )
            summaryEmbed.setTitle("This week's Raid is over.")
            console.log(
              '[Collector] Global rewards processed. Displaying summary embed.'
            )
            await i.followUp({
              embeds: [summaryEmbed, ...monsterRewardEmbeds],
              ephemeral: true,
            })
          } else if (playerWins) {
            rewardsDistributed = true
            console.log(
              '[Collector] Player won while raid is active. Entering cooldown early.'
            )
            await enterCooldownEarly()

            const raidPct = 1 - raidBoss.instance.current_hp / raidBoss.hp

            /* ── gold + gear only ───────────────────────────────── */
            const base = getUniformBaseRewards(true, raidPct) // gold + legendary flag
            const gear = getUniformGearReward(true, raidPct)

            user.gold = Number(user.gold) + base.gold
            user.currency.gear = Number(user.currency.gear) + gear
            await user.setDataValue('currency', user.currency)
            await user.save()

            const rewardEmbed = new EmbedBuilder()
              .setTitle('🏆 Raid Rewards')
              .setDescription(
                `You received:\n\n` +
                  `**Gold:** ${base.gold}\n` +
                  `**Legendary Card:** ${base.legendaryCard ? 'Yes' : 'No'}\n` +
                  `**⚙️ Gear:** ${gear}`
              )
              .setColor('Green')

            await i.followUp({ embeds: [rewardEmbed], ephemeral: true })
            collector.stop('fight_over')
          }
        }
        if (!playerWins && raidBossRotation.phase === 'active') {
          const defeatEmbed = new EmbedBuilder()
            .setTitle('💀 Defeat!')
            .setDescription(
              'Uh oh. Don’t worry, you can heal by spending tokens or waiting for your health to recharge.'
            )
            .setColor('Red')
            .setFooter({ text: getUserFooter(user) })
          console.log(
            '[Collector] Player lost the battle. Displaying defeat embed.'
          )
          await i.followUp({ embeds: [defeatEmbed], ephemeral: true })
          collector.stop('fight_over')
        }

        setTimeout(async () => {
          try {
            await i.deleteReply()
            console.log('[Outcome] Raid message deleted after battle.')
          } catch (error) {
            console.error('[Outcome] Error deleting raid message:', error)
          }
        }, 3000)
      }
    })

    collector.on('end', async (_, reason) => {
      clearInterval(renewalInterval)
      if (reason === 'fight_over') {
        console.log('Fight is over; not renewing the collector.')
        return
      }
      // Otherwise, if you want to renew for other reasons (like timeout), do it here.
      if (!rewardsDistributed) {
        // console.log(`[Raid Collector] Renewing collector for user: ${interaction.user.id}`)
        const newCollector = startCollector()
        collectors.set(interaction.user.id, newCollector)
      }
    })

    return collector
  }

  const currentCollector = startCollector()
  collectors.set(interaction.user.id, currentCollector)
}

async function handleCancelRaid(interaction, user) {
  console.log('[Cancel] Handling raid cancellation.')
  try {
    // Use update() to immediately update the message for a component interaction.
    await interaction.update({
      content: 'You have canceled the raid.',
      embeds: [],
      components: [],
    })
    console.log('[Cancel] Raid cancelled and message updated.')
    // Optionally, delete the reply after a short delay.
    setTimeout(async () => {
      try {
        await interaction.deleteReply()
        console.log('[Cancel] Raid message deleted.')
      } catch (error) {
        console.error('[Cancel] Error deleting raid message:', error)
      }
    }, 3000)
  } catch (error) {
    console.error('[Cancel] Failed to update message on cancel:', error)
    try {
      await interaction.followUp({
        content: 'You have canceled the raid.',
        ephemeral: true,
      })
    } catch (err) {
      console.error('[Cancel] Failed to follow up on cancel:', err)
    }
  }
}

async function handleHealAction(interaction, user, raidBoss, healType) {
  if (!interaction.deferred && !interaction.replied)
    await interaction.deferUpdate()

  /* ── pull freshest user/boss state ───────────────── */
  await user.reload() // avoids race with battle loop
  await raidBoss.instance.reload()

  const TOKENS_PER_100 = 10
  const HP_PER_TICK = 100

  const missing = user.score - user.current_raidHp
  if (missing <= 0) {
    return interaction.followUp({
      content: 'You are already at full HP.',
      ephemeral: true,
    })
  }

  /* ── compute desired heal & cost ─────────────────── */
  const healAmount =
    healType === 'max' ? missing : Math.min(HP_PER_TICK, missing)

  const tokensNeeded = Math.ceil(healAmount / HP_PER_TICK) * TOKENS_PER_100

  if (user.currency.tokens < tokensNeeded) {
    return interaction.followUp({
      content: `You need ${tokensNeeded} 🧿 tokens but only have ${user.currency.tokens}.`,
      ephemeral: true,
    })
  }

  /* ── apply changes atomically ────────────────────── */
  user.current_raidHp = Math.min(user.current_raidHp + healAmount, user.score)
  user.currency.tokens -= tokensNeeded
  user.changed('currency', true)
  await user.save({ fields: ['current_raidHp', 'currency'] })

  /* ── fresh embed & action row ────────────────────── */
  const updatedEmbed = createRaidBossEmbed(raidBoss, user) // raidBoss.instance is fresh
  const updatedActionRow = createInitialActionRow(user)

  try {
    await interaction.editReply({
      embeds: [updatedEmbed],
      components: [updatedActionRow],
      ephemeral: true,
    })
  } catch {
    await interaction.followUp({
      embeds: [updatedEmbed],
      components: [updatedActionRow],
      ephemeral: true,
    })
  }
}

module.exports = { startRaidEncounter }
