const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
} = require('discord.js')
const {
  User,
  ArenaMonster,
  Inventory,
  BaseItem,
  PlayerProgressStat,
} = require('../../../Models/model.js')
const {
  getOrCreatePlayer,
  determineFirstTurn,
  calculateDamageWithAgility,
  calculateFinalDamage,
  getBoostMultiplier,
} = require('../helpers/accountHelpers.js')
const { collectors, stopUserCollector } = require('../../../utils/collectors')

const damageTypeEmojis = {
  physical: '⚔️',
  cold: '❄️',
  fire: '🔥',
  water: '🌊',
  acid: '☣️',
  earth: '🪨',
}
function createDynamicHealthBar(currentHealth, maxHealth) {
  const totalSegments = 15
  let filledSegments = Math.round((currentHealth / maxHealth) * totalSegments)

  if (currentHealth > 0 && filledSegments < 1) filledSegments = 1

  let unfilledSegments = totalSegments - filledSegments
  return `\`\`\`『${'🟥'.repeat(filledSegments)}${'⬛'.repeat(
    unfilledSegments
  )}』\`\`\``
}

module.exports = {
  async execute(interaction) {
    console.log(`[FIGHT] Command started by user ${interaction.user.id}`)
    const userId = interaction.user.id
    console.log('here')
    // Stop any existing collector for this user.
    stopUserCollector(userId)
    if (collectors.has(userId)) {
      await interaction.reply({
        content: "You're already in a battle! Finish your current fight first.",
        ephemeral: true,
      })
      return
    }

    const player = await getOrCreatePlayer(userId)
    console.log(player)
    const userRecord = await User.findOne({ where: { user_id: userId } })
    if (!userRecord) {
      await interaction.reply({
        content:
          'You need to create an account first! Use /account to get started.',
        ephemeral: true,
      })
      return
    }

    let difficulty = 'easy'
    const multiplierFor = (diff) =>
      diff === 'easy' ? 1 : diff === 'medium' ? 2 : 3

    const monsters = await ArenaMonster.findAll({
      attributes: [
        'id',
        'name',
        'hp',
        'strength',
        'defense',
        'agility',
        'attacks',
        'url',
        'loot',
        'droprate',
      ],
    })
    if (!monsters || monsters.length === 0) {
      await interaction.reply({
        content: 'No challengers available. Please try again later!',
        ephemeral: true,
      })
      return
    }

    // Preload progress records using proper field names.
    const progressRecords = PlayerProgressStat
      ? await PlayerProgressStat.findAll({ where: { playerId: player.id } })
      : []
    const progressMap = {}
    progressRecords.forEach((pr) => {
      // For display, we use the easy victories (adjust as needed)
      progressMap[pr.monsterId] = pr.victories_easy || 0
    })

    const generateFightEmbed = (difficulty, monsters) => {
      const m = multiplierFor(difficulty)
      let description = 'Challengers:\n'

      monsters.forEach((mon) => {
        const victories = progressMap[mon.id] || 0
        const hpValue = mon.dataValues.hp // Ensure we access the correct property
        console.log(
          `Monster: ${mon.name}, Raw HP: ${hpValue}, Type: ${typeof hpValue}`
        )

        // Ensure hpValue is converted to a number
        const calculatedHP = Number(hpValue) * m + victories
        console.log(`Monster: ${mon.name}, Calculated HP: ${calculatedHP}`)

        description += `• **${mon.name}** - HP: ${calculatedHP}\n`
      })

      console.log(description)

      description += `\nCurrent difficulty: **${difficulty.toUpperCase()}**`
      return new EmbedBuilder()
        .setTitle('Arena Fight')
        .setDescription(description)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor('Red')
    }

    const dropdownOptions = monsters.map((mon) => ({
      label: mon.name.substring(0, 25),
      value: String(mon.id),
    }))
    const dropdownRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('monster_select')
        .setPlaceholder('Select a challenger')
        .addOptions(dropdownOptions)
    )
    const difficultyRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('difficulty_easy')
        .setLabel('Easy')
        .setStyle('Primary'),
      new ButtonBuilder()
        .setCustomId('difficulty_medium')
        .setLabel('Medium')
        .setStyle('Primary'),
      new ButtonBuilder()
        .setCustomId('difficulty_hard')
        .setLabel('Hard')
        .setStyle('Primary'),
      new ButtonBuilder()
        .setCustomId('fight_cancel')
        .setLabel('Cancel')
        .setStyle('Danger')
    )

    await interaction.reply({
      embeds: [generateFightEmbed(difficulty, monsters)],
      components: [dropdownRow, difficultyRow],
      ephemeral: true,
    })

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 30000,
    })
    collectors.set(userId, collector)

    collector.on('collect', async (i) => {
      if (i.customId === 'fight_cancel') {
        console.log('[FIGHT] Fight cancelled by user.')
        collector.stop('cancelled')
        await i.update({
          content: 'Fight cancelled.',
          embeds: [],
          components: [],
        })
        return
      }
      if (i.customId.startsWith('difficulty_')) {
        if (i.customId === 'difficulty_easy') difficulty = 'easy'
        else if (i.customId === 'difficulty_medium') difficulty = 'medium'
        else if (i.customId === 'difficulty_hard') difficulty = 'hard'
        console.log(`[FIGHT] Difficulty set to ${difficulty}`)
        await i.update({ embeds: [generateFightEmbed(difficulty, monsters)] })
      }
      if (i.customId === 'monster_select') {
        const selectedId = i.values[0]
        let selectedMonster = monsters.find(
          (mon) => String(mon.id) === selectedId
        )
        if (!selectedMonster) {
          await i.followUp({
            content: 'Challenger not found.',
            ephemeral: true,
          })
          return
        }
        const m = multiplierFor(difficulty)
        const victories = progressMap[selectedMonster.id] || 0
        selectedMonster = { ...selectedMonster.dataValues }
        selectedMonster.hp = selectedMonster.hp * m + victories
        if (selectedMonster.attacks && Array.isArray(selectedMonster.attacks)) {
          selectedMonster.attacks = selectedMonster.attacks.map((att) => ({
            ...att,
            damageMin: att.damageMin * m,
            damageMax: att.damageMax * m,
          }))
        }
        console.log(
          `[FIGHT] Selected challenger ${selectedMonster.name} with effective HP: ${selectedMonster.hp}`
        )
        collector.stop('battle')
        await i.update({
          content: `Starting battle against **${
            selectedMonster.name
          }** at **${difficulty.toUpperCase()}** difficulty!`,
          embeds: [],
          components: [],
        })
        // Do not reset player's HP—preserve the damage taken.
        startBattle(
          interaction,
          player,
          selectedMonster,
          userRecord,
          difficulty
        )
      }
    })

    collector.on('end', async (_, reason) => {
      collectors.delete(userId)
      if (reason !== 'battle' && reason !== 'cancelled') {
        await interaction.editReply({ components: [] })
        await interaction.followUp({
          content: "Your battle request expired. Try again when you're ready!",
          ephemeral: true,
        })
      }
    })

    async function startBattle(
      interaction,
      player,
      monster,
      userRecord,
      difficulty
    ) {
      console.log(
        `[BATTLE] Starting battle against ${monster.name} (Difficulty: ${difficulty})`
      )
      const effectiveStrength =
        player.strength + (4 + Math.floor(0.1 * userRecord.brute_score))
      const effectiveDefense =
        player.defense + (4 + Math.floor(0.1 * userRecord.stealth_score))
      const effectiveAgility =
        player.agility + (4 + Math.floor(0.1 * userRecord.stealth_score))
      console.log(
        `[BATTLE] effectiveAgility: ${effectiveAgility}, enemy agility: ${monster.agility}`
      )
      const firstTurn = determineFirstTurn(
        effectiveAgility,
        Number(monster.agility) || 1
      )
      console.log(`[BATTLE] First turn determined as: ${firstTurn}`)

      const battleState = {
        playerHP: player.current_hp,
        monsterHP: monster.hp,
        history: [],
        turn: firstTurn,
      }

      battleState.history.push(
        firstTurn === 'player'
          ? 'You get the first attack!'
          : `${monster.name} gets the first attack!`
      )

      const generateBattleEmbed = () => {
        return new EmbedBuilder()
          .setTitle(`Battle: ${monster.name}`)
          .setDescription(
            `**Your HP:** ${battleState.playerHP}/${player.max_hp}\n` +
              `${createDynamicHealthBar(
                battleState.playerHP,
                player.max_hp
              )}\n` +
              `${
                battleState.history.slice(-5).join('\n') || 'No actions yet.'
              }\n\n` +
              `**Enemy HP:** ${battleState.monsterHP}/${monster.hp}\n` +
              `${createDynamicHealthBar(battleState.monsterHP, monster.hp)}`
          )
          .setColor('Blue')
          .addFields({ name: '\u200B', value: '\u200B' }) // **Forces expansion**
          .setFooter({ text: 'Use the buttons below to attack or defend!' }) // Adds more content
          .setThumbnail(
            `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.url}.png`
          )
      }

      const equippedItems = await Inventory.findAll({
        where: { ArenaId: player.id, equipped: true },
        include: { model: BaseItem, as: 'item' },
      })
      const equippedWeapons = equippedItems.filter(
        (item) => item.item.type === 'weapon'
      )

      const generateActionButtons = () => {
        const row = new ActionRowBuilder()
        if (equippedWeapons.length > 0) {
          equippedWeapons.forEach((weapon, index) => {
            const baseSwing = calculateDamageWithAgility(
              weapon.item.damageMin,
              weapon.item.damageMax,
              effectiveAgility,
              monster.agility
            )
            const damage = Math.floor(baseSwing * (effectiveStrength / 10))
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`weapon_${index}`)
                .setLabel(`${weapon.item.name} [${damage}]`)
                .setStyle('Secondary')
            )
          })
        } else {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId('basic_attack')
              .setLabel('Basic Attack')
              .setStyle('Primary')
          )
        }
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('fierce_attack')
            .setLabel('Fierce Attack')
            .setStyle('Danger')
        )
        return row
      }

      async function generateConsumableDropdown() {
        const consumables = await Inventory.findAll({
          where: { ArenaId: player.id },
          include: { model: BaseItem, as: 'item' },
        })
        const filtered = consumables.filter(
          (c) => c.item.type === 'consumable' && c.quantity > 0
        )
        const grouped = {}
        filtered.forEach((c) => {
          const qty = c.quantity
          const key = c.item.id
          if (!grouped[key]) {
            grouped[key] = { item: c.item, quantity: qty, invId: c.id }
          } else {
            grouped[key].quantity += qty
          }
        })
        const options = Object.values(grouped).map((g) => ({
          label: `${g.item.name} (${g.quantity})`.substring(0, 25),
          value: String(g.invId),
          description: `${g.item.damageMin}-${g.item.damageMax} ${g.item.damageType}`,
        }))
        if (options.length > 0) {
          return new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('consumable_select')
              .setPlaceholder('Use a consumable')
              .addOptions(options)
          )
        } else {
          return null
        }
      }

      async function generateActionRows() {
        const attackRow = generateActionButtons()
        const consumableDropdown = await generateConsumableDropdown()
        return consumableDropdown
          ? [consumableDropdown, attackRow]
          : [attackRow]
      }

      await interaction.editReply({
        embeds: [generateBattleEmbed()],
        components: await generateActionRows(),
      })

      const battleCollector =
        interaction.channel.createMessageComponentCollector({
          filter: (i) => i.user.id === userId,
          time: 60000,
        })

      battleCollector.on('collect', async (btnInteraction) => {
        await btnInteraction.deferUpdate()
        const action = btnInteraction.customId
        if (battleState.turn === 'monster') {
          await handleEnemyTurn()
        }
        if (action === 'basic_attack') {
          const damageResult = calculateFinalDamage(
            1,
            2,
            effectiveAgility,
            monster.agility,
            'physical',
            monster
          )
          battleState.monsterHP = Math.max(
            battleState.monsterHP - damageResult.damage,
            0
          )
          battleState.history.push(
            damageResult.message
              ? damageResult.message
              : `You deal ${damageResult.damage} ${damageTypeEmojis.physical} damage to ${monster.name}!`
          )
        }

        if (action.startsWith('weapon_')) {
          const weaponIndex = parseInt(action.split('_')[1], 10)
          const weapon = equippedWeapons[weaponIndex]?.item

          if (!weapon) {
            await btnInteraction.followUp({
              content: 'Weapon not found.',
              ephemeral: true,
            })
            return
          }

          let attackDamageType = weapon.damageType || 'physical'

          // Ensure the damage is correctly calculated with strength and agility bonuses
          const baseSwing = calculateDamageWithAgility(
            weapon.damageMin,
            weapon.damageMax,
            effectiveAgility,
            monster.agility
          )

          // Adjusting final damage calculation
          const damage = Math.max(
            Math.floor(
              baseSwing + effectiveStrength * 0.75 - monster.defense * 0.5
            ),
            2 // Minimum weapon damage should be at least 2
          )

          battleState.monsterHP = Math.max(battleState.monsterHP - damage, 0)

          battleState.history.push(
            `You attack with **${weapon.name}** and deal **${damage}** ${
              damageTypeEmojis[attackDamageType] || '⚔️'
            } damage to **${monster.name}**!`
          )
        } else if (action === 'fierce_attack') {
          const baseSwing = calculateDamageWithAgility(
            1,
            2,
            effectiveAgility,
            monster.agility
          )
          const fierceDamage = Math.floor(
            baseSwing * 1.5 * (effectiveStrength / 10)
          )
          const finalFierce = Math.max(
            fierceDamage -
              monster.defense * getBoostMultiplier(monster.defense),
            2
          )
          battleState.monsterHP = Math.max(
            battleState.monsterHP - finalFierce,
            0
          )
          battleState.history.push(
            `You unleash a fierce attack for ${finalFierce} damage!`
          )
        } else if (action === 'consumable_select') {
          const selectedInvId = btnInteraction.values[0]
          const consumableRecord = await Inventory.findOne({
            where: { id: selectedInvId },
            include: { model: BaseItem, as: 'item' },
          })

          if (!consumableRecord) {
            await btnInteraction.followUp({
              content: 'Consumable not found.',
              ephemeral: true,
            })
            return
          }

          // Extract attack data from the consumable
          const consumableAttack = {
            damageMin: consumableRecord.item.damageMin || 1,
            damageMax: consumableRecord.item.damageMax || 2,
            damageType: consumableRecord.item.damageType || 'physical',
            name: consumableRecord.item.name,
          }

          const damageResult = calculateFinalDamage(
            consumableAttack.damageMin,
            consumableAttack.damageMax,
            monster.agility,
            effectiveAgility,
            consumableAttack.damageType,
            player
          )

          battleState.playerHP = Math.max(
            battleState.playerHP - damageResult.damage,
            0
          )

          battleState.history.push(
            damageResult.message
              ? damageResult.message
              : `${monster.name} uses **${
                  consumableAttack.name
                }** and deals **${damageResult.damage}** ${
                  damageTypeEmojis[consumableAttack.damageType] || '⚔️'
                } damage!`
          )

          await Inventory.decrement('quantity', {
            by: 1,
            where: { id: selectedInvId },
          })
        }

        if (battleState.monsterHP <= 0) {
          battleCollector.stop('victory')
          return
        }
        await handleEnemyTurn()
        battleState.turn = 'player'
        await btnInteraction.editReply({
          embeds: [generateBattleEmbed()],
          components: await generateActionRows(),
        })
      })

      battleCollector.on('end', async (_, reason) => {
        console.log(`[BATTLE] Battle ended with reason: ${reason}`)

        // Persist the player's HP
        await player.update({ current_hp: battleState.playerHP })
        console.log(`[BATTLE] Player HP updated to: ${battleState.playerHP}`)

        let resultEmbed = new EmbedBuilder()

        if (reason === 'victory') {
          console.log(
            `[BATTLE] Victory processing for ${player.id} vs ${monster.name}`
          )

          // Handle Arena scoring
          if (difficulty === 'easy') {
            console.log('[BATTLE] Incrementing victories_easy')
            await PlayerProgressStat.increment('victories_easy', {
              by: 1,
              where: { playerId: player.id, monsterId: monster.id },
            })
            progress = await PlayerProgressStat.findOne({
              where: { playerId: player.id, monsterId: monster.id },
            })
            pointsAwarded = 10 + progress.victories_easy * 1
          } else if (difficulty === 'medium') {
            console.log('[BATTLE] Incrementing victories_medium')
            await PlayerProgressStat.increment('victories_medium', {
              by: 1,
              where: { playerId: player.id, monsterId: monster.id },
            })
            progress = await PlayerProgressStat.findOne({
              where: { playerId: player.id, monsterId: monster.id },
            })
            pointsAwarded = 10 + progress.victories_medium * 2
          } else if (difficulty === 'hard') {
            console.log('[BATTLE] Incrementing victories_hard')
            await PlayerProgressStat.increment('victories_hard', {
              by: 1,
              where: { playerId: player.id, monsterId: monster.id },
            })
            progress = await PlayerProgressStat.findOne({
              where: { playerId: player.id, monsterId: monster.id },
            })
            pointsAwarded = 10 + progress.victories_hard * 3
          }

          console.log(`[BATTLE] Points awarded: ${pointsAwarded}`)
          await player.increment('arenaScore', { by: pointsAwarded })

          resultEmbed
            .setTitle('🏆 Victory! - Battle Result')
            .setDescription(
              `🎉 You defeated **${monster.name}**!\nArena Score **+${pointsAwarded}**`
            )
            .setColor('Green')
            .setThumbnail(
              `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.url}.png`
            )
            .setFooter({ text: `Arena Score: ${player.arenaScore}` })
        } else if (reason === 'defeat') {
          console.log(
            `[BATTLE] Processing defeat for player ${player.id} vs ${monster.name}`
          )

          // Handle Arena scoring
          if (difficulty === 'easy') {
            console.log('[BATTLE] Decrementing victories_easy')
            await PlayerProgressStat.increment('victories_easy', {
              by: -1,
              where: { playerId: player.id, monsterId: monster.id },
            })
            progress = await PlayerProgressStat.findOne({
              where: { playerId: player.id, monsterId: monster.id },
            })
            pointsAwarded = Math.max(0, 10 - progress.victories_easy * 1)
          } else if (difficulty === 'medium') {
            console.log('[BATTLE] Decrementing victories_medium')
            await PlayerProgressStat.increment('victories_medium', {
              by: -1,
              where: { playerId: player.id, monsterId: monster.id },
            })
            progress = await PlayerProgressStat.findOne({
              where: { playerId: player.id, monsterId: monster.id },
            })
            pointsAwarded = Math.max(0, 10 - progress.victories_medium * 2)
          } else if (difficulty === 'hard') {
            console.log('[BATTLE] Decrementing victories_hard')
            await PlayerProgressStat.increment('victories_hard', {
              by: -1,
              where: { playerId: player.id, monsterId: monster.id },
            })
            progress = await PlayerProgressStat.findOne({
              where: { playerId: player.id, monsterId: monster.id },
            })
            pointsAwarded = Math.max(0, 10 - progress.victories_hard * 3)
          }

          // Ensure player's score is updated first
          await player.increment('arenaScore', { by: -Math.abs(pointsAwarded) })

          // Fetch updated score
          const updatedPlayer = await User.findOne({
            where: { user_id: userId },
          })

          resultEmbed
            .setTitle('☠️ Defeat - Battle Result')
            .setDescription(`💔 You were defeated by **${monster.name}**.`)
            .setColor('Red')
            .setThumbnail(
              `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.url}.png`
            )
            .setFooter({ text: `Arena Score: ${updatedPlayer.arenaScore}` })

          await interaction.editReply({ embeds: [resultEmbed], components: [] })
        } else {
          resultEmbed
            .setDescription('⏳ The battle ended due to inactivity.')
            .setColor('Grey')
        }

        console.log('[BATTLE] Sending battle result embed.')

        // **Ensure final embed is sent**
        await interaction.editReply({ embeds: [resultEmbed], components: [] })

        // await interaction.followUp({
        //   content: 'Battle has concluded.',
        //   ephemeral: true,
        // })
      })

      async function handleEnemyTurn() {
        const monsterAttacks = monster.attacks || []

        // Ensure there is at least one attack available
        if (!monsterAttacks.length) {
          console.error(
            `[ERROR] Monster ${monster.name} has no attacks defined!`
          )
          battleState.history.push(
            `${monster.name} looks confused and doesn't attack!`
          )
          return
        }

        // Pick a random attack from available options
        const chosenAttack =
          monsterAttacks[Math.floor(Math.random() * monsterAttacks.length)]

        // Ensure `chosenAttack` is valid before using its properties
        if (
          !chosenAttack ||
          typeof chosenAttack.damageMin === 'undefined' ||
          typeof chosenAttack.damageMax === 'undefined'
        ) {
          console.error(
            `[ERROR] Invalid attack data for ${monster.name}:`,
            chosenAttack
          )
          battleState.history.push(
            `${monster.name} tries to attack but something goes wrong!`
          )
          return
        }

        console.log(
          `[BATTLE] ${monster.name} is attacking with ${chosenAttack.name} (${chosenAttack.damageMin}-${chosenAttack.damageMax})`
        )

        // Calculate damage
        const baseDamage =
          Math.random() * (chosenAttack.damageMax - chosenAttack.damageMin) +
          chosenAttack.damageMin

        const finalMonsterDamage = Math.max(
          Math.floor(baseDamage * 0.75) - (player.defense * 0.5 || 0),
          1
        )

        battleState.playerHP = Math.max(
          battleState.playerHP - finalMonsterDamage,
          0
        )

        battleState.history.push(
          `${monster.name} uses **${
            chosenAttack.name
          }** and deals **${finalMonsterDamage}** ${
            damageTypeEmojis[chosenAttack.damageType] || '⚔️'
          } damage!`
        )

        if (battleState.playerHP <= 0) {
          battleCollector.stop('defeat') // 🔴 This will trigger the defeat embed
          return
        }
      }
    }
  },
}
