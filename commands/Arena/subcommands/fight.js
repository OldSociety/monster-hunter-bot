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
  getBoostMultiplier,
} = require('../helpers/accountHelpers.js')
const { collectors, stopUserCollector } = require('../../utils/collectors')

const damageTypeEmojis = {
  physical: '⚔️',
  cold: '❄️',
  fire: '🔥',
  water: '🌊',
  acid: '☣️',
  earth: '🪨',
}

module.exports = {
  async execute(interaction) {
    console.log(`[FIGHT] Command started by user ${interaction.user.id}`)
    const userId = interaction.user.id
    // Stop any existing collector for this user.
    stopUserCollector(userId)

    const player = await getOrCreatePlayer(userId)
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
        description += `• **${mon.name}** - HP: ${mon.hp * m + victories}\n`
      })
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
      time: 60000,
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
        playerHP: player.hp,
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
            `Your HP: ${battleState.playerHP}\nEnemy HP: ${battleState.monsterHP}\n\n` +
              (battleState.history.slice(-5).join('\n') || 'No actions yet.')
          )
          .setColor('Blue')
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
          const baseSwing = calculateDamageWithAgility(
            1,
            2,
            effectiveAgility,
            monster.agility
          )
          const attackDamage = Math.floor(baseSwing * (effectiveStrength / 10))
          const finalDamage = Math.max(
            attackDamage -
              monster.defense * getBoostMultiplier(monster.defense),
            1
          )
          battleState.monsterHP = Math.max(
            battleState.monsterHP - finalDamage,
            0
          )
          battleState.history.push(
            `You deal ${finalDamage} ${damageTypeEmojis.physical} damage to ${monster.name}!`
          )
        } else if (action.startsWith('weapon_')) {
          const weaponIndex = parseInt(action.split('_')[1], 10)
          const weapon = equippedWeapons[weaponIndex]?.item
          let attackDamageType = 'physical'
          if (weapon) attackDamageType = weapon.damageType || 'physical'
          const baseSwing = calculateDamageWithAgility(
            weapon.item ? weapon.item.damageMin : weapon.damageMin,
            weapon.item ? weapon.item.damageMax : weapon.damageMax,
            effectiveAgility,
            monster.agility
          )
          const damage = Math.floor(baseSwing * (effectiveStrength / 10))
          battleState.monsterHP = Math.max(battleState.monsterHP - damage, 0)
          battleState.history.push(
            `You attack with ${weapon.name} for ${damage} ${
              damageTypeEmojis[attackDamageType] || '⚔️'
            } damage!`
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
          const minD = consumableRecord.item.damageMin
          const maxD = consumableRecord.item.damageMax
          const baseDamage =
            Math.floor(Math.random() * (maxD - minD + 1)) + minD
          const finalDamage = Math.floor(baseDamage * (effectiveStrength / 10))
          battleState.monsterHP = Math.max(
            battleState.monsterHP - finalDamage,
            0
          )
          battleState.history.push(
            `You use ${consumableRecord.item.name} for ${finalDamage} ${
              damageTypeEmojis[consumableRecord.item.damageType] || '⚔️'
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
        // Persist the player's HP as-is (do not reset it).
        await player.update({ hp: battleState.playerHP })
        console.log(`[BATTLE] Player HP updated to: ${battleState.playerHP}`)
        const resultEmbed = new EmbedBuilder()
        let pointsAwarded
        if (reason === 'victory') {
          console.log(
            `[BATTLE] Processing victory for player ${player.id} vs monster ${monster.name}`
          )
          if (PlayerProgressStat) {
            let progress = await PlayerProgressStat.findOne({
              where: { playerId: player.id, monsterId: monster.id },
            })
            if (!progress) {
              console.log(
                '[BATTLE] No progress record found, creating new entry.'
              )
              progress = await PlayerProgressStat.create({
                playerId: player.id,
                monsterId: monster.id,
                victories_easy: 0,
                victories_medium: 0,
                victories_hard: 0,
              })
            }
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
          } else {
            console.warn(
              'PlayerProgressStat is not defined; skipping victory count update.'
            )
            pointsAwarded = 10
            await player.increment('arenaScore', { by: 10 })
          }
          // Loot drop logic
          if (monster.loot && Math.random() < monster.droprate) {
            console.log(
              `[LOOT] Attempting loot drop. Monster loot ID: ${monster.loot}`
            )
            try {
              const lootItem = await BaseItem.findOne({
                where: { id: monster.loot },
              })
              if (!lootItem) {
                console.warn(
                  `[LOOT] Loot item with ID ${monster.loot} not found.`
                )
              } else {
                console.log(
                  `[LOOT] Found loot item: ${lootItem.name} (ID: ${lootItem.id})`
                )
                await Inventory.create({
                  ArenaId: player.id,
                  itemId: lootItem.id,
                  equipped: false,
                  quantity: 1,
                })
                console.log(
                  `[LOOT] Added ${lootItem.name} to player's inventory.`
                )
                resultEmbed.addFields({
                  name: 'Loot Obtained!',
                  value: `You received **${lootItem.name}**! 🎁`,
                })
              }
            } catch (error) {
              console.error(
                `[LOOT ERROR] Failed to award loot: ${error.message}`
              )
            }
          }
          resultEmbed
            .setTitle('Victory! - Battle Result')
            .setDescription(
              `🎉 You defeated ${monster.name}!\nArena Score +${pointsAwarded}`
            )
            .setColor('Green')
            .setImage(
              `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.url}.png`
            )
            .setFooter({
              text: `Arena Score: ${player.arenaScore} | Arena Ranking: 0`,
            })
            .setThumbnail(interaction.user.displayAvatarURL())
        } else if (reason === 'defeat') {
          console.log(
            `[BATTLE] Processing defeat for player ${player.id} vs monster ${monster.name}`
          )
          if (PlayerProgressStat) {
            let progress = await PlayerProgressStat.findOne({
              where: { playerId: player.id, monsterId: monster.id },
            })
            if (!progress) {
              console.log(
                '[BATTLE] No progress record found on defeat, creating new entry.'
              )
              progress = await PlayerProgressStat.create({
                playerId: player.id,
                monsterId: monster.id,
                victories_easy: 0,
                victories_medium: 0,
                victories_hard: 0,
              })
            } else {
              if (difficulty === 'easy' && progress.victories_easy > 0) {
                console.log('[BATTLE] Decrementing victories_easy')
                await PlayerProgressStat.decrement('victories_easy', {
                  by: 1,
                  where: { playerId: player.id, monsterId: monster.id },
                })
              } else if (
                difficulty === 'medium' &&
                progress.victories_medium > 0
              ) {
                console.log('[BATTLE] Decrementing victories_medium')
                await PlayerProgressStat.decrement('victories_medium', {
                  by: 1,
                  where: { playerId: player.id, monsterId: monster.id },
                })
              } else if (difficulty === 'hard' && progress.victories_hard > 0) {
                console.log('[BATTLE] Decrementing victories_hard')
                await PlayerProgressStat.decrement('victories_hard', {
                  by: 1,
                  where: { playerId: player.id, monsterId: monster.id },
                })
              }
            }
          }
          resultEmbed
            .setTitle('Defeat - Battle Result')
            .setDescription(`💔 You were defeated by ${monster.name}.`)
            .setColor('Red')
            .setThumbnail(
              `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.url}.png`
            )
            .setFooter({
              text: `Arena Score: ${player.arenaScore} | Arena Ranking: 0`,
            })
            .setThumbnail(interaction.user.displayAvatarURL())
          await player.increment('arenaScore', { by: -10 })
        } else {
          resultEmbed
            .setDescription('⏳ The battle ended due to inactivity.')
            .setColor('Grey')
        }
        console.log('[BATTLE] Sending battle result embed.')
        await interaction.followUp({ embeds: [resultEmbed] })
      })

      async function handleEnemyTurn() {
        const monsterAttacks = monster.attacks || []
        const chosenAttack = monsterAttacks[0]
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
          `${monster.name} uses ${
            chosenAttack.name
          } and deals ${finalMonsterDamage} ${
            damageTypeEmojis[chosenAttack.damageType] || '⚔️'
          } damage!`
        )
        if (battleState.playerHP <= 0) {
          await interaction.editReply({
            embeds: [generateBattleEmbed()],
            components: [],
          })
          return interaction.followUp({
            content: `💀 You were defeated by ${monster.name}!`,
          })
        }
      }
    }
  },
}
