// commands/arena.js
/* eslint-disable consistent-return */
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require('discord.js')
const { Op } = require('sequelize')

const { Arena, Collection, Monster, User } = require('../../Models/model') // adjust path
const { classifyMonsterType } = require('../Hunt/huntUtils/huntHelpers')

// ──────────────────────────────────── helpers
const BOOST_TABLE = [
  { t: 450, m: 5.0 },
  { t: 400, m: 4.5 },
  { t: 350, m: 4.0 },
  { t: 300, m: 3.5 },
  { t: 250, m: 3.0 },
  { t: 200, m: 2.5 },
  { t: 150, m: 2.0 },
  { t: 100, m: 1.75 },
  { t: 75, m: 1.5 },
  { t: 50, m: 1.3 },
  { t: 25, m: 1.15 },
  { t: 10, m: 1.0 },
  { t: 0, m: 1.0 },
]
function boost(stat) {
  return BOOST_TABLE.find((b) => stat >= b.t).m
}

async function getOrCreateArena(userId) {
  const [acc] = await Arena.findOrCreate({
    where: { userId },
    defaults: {
      max_hp: 10,
      strength: 5,
      defense: 5,
      agility: 5,
      statPoints: 5,
    },
  })
  return acc
}

// build deck from Monsters.arenaEffect
async function makeDeck(userId) {
  const rows = await Collection.findAll({
    where: { userId, cr: { [Op.gte]: 11 } },
    include: [{ model: Monster }], // <‑‑ easy!
  })

  return rows.map((r) => {
    const eff = r.Monster.arenaEffect
    const style = r.Monster.combatType // brute / stealth / spellsword

    let keyword, val
    if (eff) {
      keyword = Object.keys(eff)[0]
      val = Object.values(eff)[0]
    } else {
      keyword = style === 'brute' ? 'strike' : 'guard'
      val = r.Monster.cr - 10
    }
    return { id: r.id, name: r.name, style, keyword, val }
  })
}

// draw helper
function drawToFive(match) {
  while (match.hand.length < 5 && match.deck.length) {
    match.hand.push(match.deck.pop())
  }
}

// ──────────────────────────────────── embed builders
function buildOverviewEmbed(user, acc, pointsLeft) {
  const stats = {
    str: acc.strength,
    def: acc.defense,
    int: acc.intelligence,
    agi: acc.agility,
  }
  const e = new EmbedBuilder()
    .setTitle(`${user.username}'s Arena Sheet`)
    .setColor('DarkRed')

  if (pointsLeft) {
    e.setDescription(
      `Allocate **${pointsLeft}** points (max 10 each).\n\n` +
        `STR ${stats.str} | DEF ${stats.def} | INT ${stats.int} | AGI ${stats.agi}`
    )
  } else {
    e.setDescription(
      `Current Stats\n` +
        `STR ${stats.str} | DEF ${stats.def} | INT ${stats.int} | AGI ${stats.agi}\n\n` +
        `Next Opponent: 🛡️ TEST DUMMY – 15 HP / 2 DMG`
    )
  }
  return e
}

function buildBattleEmbed(user, m, enemy) {
  return new EmbedBuilder()
    .setTitle(`Arena – ${user.username} vs ${enemy.name}`)
    .setDescription(
      `👤 HP ${m.playerHp} / 🛡️ ${m.shield}\n` +
        `👾 HP ${m.enemyHp}\n\n` +
        (m.history.slice(-4).join('\n') || '*No moves yet*')
    )
    .setColor('Gold')
}

function buildActionRows(hand, fierceDisabled, stats) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('basic')
      .setLabel('Basic')
      .setStyle('Primary'),
    new ButtonBuilder()
      .setCustomId('fierce')
      .setLabel('Fierce')
      .setStyle('Danger')
      .setDisabled(fierceDisabled)
  )

  if (!hand.length) return [row1] // no dropdown when deck empty

  const row2 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('play_card')
      .setPlaceholder('Play a card')
      .addOptions(
        hand.map((c) => ({
          label: menuLabel(c, stats),
          value: String(c.id),
        }))
      )
  )
  return [row1, row2]
}

// ──────────────────────────────────── card logic
function applyCard(card, match, stats) {
  switch (card.keyword) {
    case 'strike':
      match.enemyHp -= Math.ceil(card.val * boost(stats.str))
      break
    case 'guard':
      match.shield = Math.min(
        15,
        match.shield + Math.ceil(card.val * boost(stats.def))
      )
      break
    case 'freeze':
      match.freezeEnemy = true
      break
    case 'poison':
      match.poisonTicks = 3
      match.poisonVal = card.val
      break
    case 'heal':
      match.playerHp = Math.min(stats.maxHp, match.playerHp + card.val)
      break
    case 'reflect':
      match.reflectNext = card.val
      break
    // add other effects here
  }
}

function menuLabel(card, stats) {
  const base = `${card.name}`.slice(0, 15) // monster
  const mult =
    card.keyword === 'strike'
      ? Math.ceil(card.val * boost(stats.str))
      : card.keyword === 'guard'
      ? Math.ceil(card.val * boost(stats.def))
      : card.val
  const tag = `${card.keyword.toUpperCase()} ${mult}`
  // ensure whole label ≤ 25
  return (base + ' ' + tag).slice(0, 25)
}

// ──────────────────────────────────── export command
module.exports = {
  data: new SlashCommandBuilder()
    .setName('arena')
    .setDescription('Arena account & battle')
    .addSubcommand((s) =>
      s.setName('overview').setDescription('View / allocate stats')
    )
    .addSubcommand((s) =>
      s.setName('fight').setDescription('Start a test fight')
    ),

  async execute(interaction) {
    // const allowed = [process.env.BOTTESTCHANNELID]
    // if (!allowed.includes(interaction.channel.id)) {
    //   return interaction.reply({ content: 'Wrong channel', ephemeral: true })
    // }

    const user = interaction.user
    const sub = interaction.options.getSubcommand()
    const acc = await getOrCreateArena(user.id)

/* ───────── overview ───────── */
if (sub === 'overview') {
  // 1) load style scores from Users
  const baseUser = await User.findOne({ where: { user_id: user.id }, raw: true })
  if (!baseUser) {
    return interaction.reply({ content: 'Create an account first.', ephemeral: true })
  }

  // 2) derived stats
  const derived = {
    str: Math.floor(4 + 0.1 * baseUser.brute_score),
    def: Math.floor(4 + 0.1 * baseUser.stealth_score),
    int: Math.floor(4 + 0.1 * baseUser.spellsword_score),
    agi: Math.floor(4 + 0.1 * baseUser.stealth_score),
  }

  // 3) total = derived + allocated
  const totals = {
    str: derived.str + acc.strength,
    def: derived.def + acc.defense,
    int: derived.int + (acc.intelligence ?? 0),
    agi: derived.agi + acc.agility,
  }

  /* embed builder */
  const overviewEmbed = new EmbedBuilder()
    .setTitle(`${user.username}'s Arena Sheet`)
    .setColor('DarkRed')
    .setDescription(
      `**Allocated / Derived / Total**\n` +
      `STR ${acc.strength} / ${derived.str} / ${totals.str}\n` +
      `DEF ${acc.defense} / ${derived.def} / ${totals.def}\n` +
      `INT ${acc.intelligence ?? 0} / ${derived.int} / ${totals.int}\n` +
      `AGI ${acc.agility} / ${derived.agi} / ${totals.agi}\n\n` +
      (acc.statPoints
        ? `You have **${acc.statPoints}** points left.`
        : `No unallocated points.`)
    )

  /* allocation buttons row (unchanged) */
  const btnRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('str').setLabel('STR +1').setStyle('Primary'),
    new ButtonBuilder().setCustomId('def').setLabel('DEF +1').setStyle('Primary'),
    new ButtonBuilder().setCustomId('int').setLabel('INT +1').setStyle('Primary'),
    new ButtonBuilder().setCustomId('agi').setLabel('AGI +1').setStyle('Primary')
  )

  await interaction.reply({
    embeds: [overviewEmbed],
    components: acc.statPoints ? [btnRow] : [],
    ephemeral: true,
  })

  /* allocation collector … (leave existing code as‑is) */
  return
}


    /* ───────── fight ───────── */
    if (sub === 'fight') {
      await interaction.deferReply({ ephemeral: true })

      const deck = await makeDeck(user.id)
      if (deck.length === 0) {
        return interaction.editReply('You have no eligible cards (CR ≥ 11).')
      }
      // shuffle
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[deck[i], deck[j]] = [deck[j], deck[i]]
      }

      // match state
      const match = {
        playerHp: acc.max_hp,
        shield: 0,
        enemyHp: 15,
        deck,
        hand: [],
        history: [],
        fierceCooldown: false,
      }
      drawToFive(match)

      const enemy = { name: 'TEST DUMMY', dmg: 2 }

      await interaction.editReply({
        embeds: [buildBattleEmbed(user, match, enemy)],
        components: buildActionRows(match.hand, false, {
          str: acc.strength,
          def: acc.defense,
        }),
      })

      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === user.id,
        time: 600000,
      })

      collector.on('collect', async (i) => {
        await i.deferUpdate()
        const stats = { str: acc.strength, def: acc.defense, maxHp: acc.max_hp }

        /* player action */
        if (i.customId === 'basic') {
          const dmg = Math.ceil(1 * boost(stats.str))
          match.enemyHp -= dmg
          match.history.push(`You BASIC for **${dmg}**`)
        } else if (i.customId === 'fierce' && !match.fierceCooldown) {
          const dmg = Math.ceil(2 * boost(stats.str))
          match.enemyHp -= dmg
          match.fierceCooldown = true
          match.history.push(`You FIERCE for **${dmg}**`)
        } else if (i.customId === 'play_card') {
          const cardId = Number(i.values[0])
          const cardIdx = match.hand.findIndex((c) => c.id === cardId)
          const card = match.hand[cardIdx]
          if (card) {
            applyCard(card, match, stats)
            match.history.push(`You play **${card.name}** (${card.keyword})`)
            match.hand.splice(cardIdx, 1)
          }
        }

        /* enemy dead? */
        if (match.enemyHp <= 0) {
          collector.stop('victory')
          return
        }

        /* enemy turn (simple) */
        const eDmg = enemy.dmg - match.shield
        const dealt = Math.max(eDmg, 0)
        match.playerHp -= dealt
        match.shield = Math.max(match.shield - enemy.dmg, 0)
        match.history.push(`Enemy hits for **${dealt}**`)

        if (match.playerHp <= 0) {
          collector.stop('defeat')
          return
        }

        // upkeep
        if (match.poisonTicks) {
          match.enemyHp -= match.poisonVal
          match.poisonTicks--
          match.history.push(`Poison deals **${match.poisonVal}**`)
        }
        match.fierceCooldown = false
        drawToFive(match)

        await i.editReply({
          embeds: [buildBattleEmbed(user, match, enemy)],
          components: buildActionRows(match.hand, match.fierceCooldown, {
            str: acc.strength,
            def: acc.defense,
          }),
        })
      })

      collector.on('end', async (_c, reason) => {
        const end = new EmbedBuilder().setTitle('Battle Result')
        if (reason === 'victory')
          end.setDescription('🏆 **You win!**').setColor('Green')
        else if (reason === 'defeat')
          end.setDescription('💀 **You were defeated.**').setColor('Red')
        else end.setDescription('⌛ Timeout').setColor('Grey')

        await interaction.editReply({ embeds: [end], components: [] })
      })
    }
  },
}
