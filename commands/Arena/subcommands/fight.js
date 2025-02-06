const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js')
const {
  User,
  Inventory,
  ArenaMonster,
  BaseItem,
} = require('../../../Models/model.js')
const {
  getOrCreatePlayer,
  calculateDamageWithAgility,
  getBoostMultiplier,
  determineFirstTurn,
} = require('../helpers/accountHelpers.js')

module.exports = {
  async execute(interaction) {
    const userId = interaction.user.id
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

    const effectiveStrength =
      player.strength + (4 + Math.floor(0.1 * userRecord.brute_score))
    const effectiveDefense =
      player.defense + (4 + Math.floor(0.1 * userRecord.stealth_score))
    const effectiveAgility =
      player.agility + (4 + Math.floor(0.1 * userRecord.stealth_score))
    const effectiveIntelligence =
      player.intelligence + (4 + Math.floor(0.1 * userRecord.spellsword_score))

    const damageTypeEmojis = {
      physical: '⚔️',
      cold: '❄️',
      fire: '🔥',
      water: '🌊',
      acid: '☣️',
      earth: '🪨',
    }

    const equippedItems = await Inventory.findAll({
      where: { ArenaId: player.id, equipped: true },
      include: { model: BaseItem, as: 'item' },
    })
    const equippedWeapons = equippedItems.filter(
      (item) => item.item.type === 'weapon'
    )
    const equippedDefenseItems = equippedItems.filter(
      (item) => item.item.type === 'defense'
    )

    let monster
    try {
      await interaction.deferReply({ ephemeral: true })
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
        return interaction.editReply({
          content: 'No monsters available. Please try again later!',
        })
      }
      monster = monsters[Math.floor(Math.random() * monsters.length)]
      if (!monster) {
        return interaction.editReply({
          content: 'No monsters available. Please try again later!',
        })
      }
      await interaction.editReply({
        content: `You are battling **${monster.name}**! Prepare for combat!`,
      })
    } catch (error) {
      console.error(`Error fetching monster: ${error.message}`)
      return interaction.editReply({
        content:
          'An error occurred while starting the battle. Please try again later.',
      })
    }

    const firstTurn = determineFirstTurn(
      effectiveAgility,
      Number(monster.agility) || 1
    )

    const battleState = {
      playerHP: player.hp,
      monsterHP: monster.hp,
      history: [],
      turn: firstTurn,
    }

    battleState.history.push(
      firstTurn === 'player'
        ? '🎯 You get the first attack!'
        : `🎯 ${monster.name} gets the first attack!`
    )

    if (battleState.turn === 'monster') {
      await handleEnemyTurn(interaction, battleState, monster, player)
    }

    const generateBattleEmbed = () =>
      new EmbedBuilder()
        .setTitle(`${monster.name}`)
        .setDescription(
          `**Your HP:** ${battleState.playerHP}\n` +
            `🔥 **Enemy HP:** ${battleState.monsterHP}\n\n` +
            `**Battle History:**\n${
              battleState.history.slice(-5).join('\n') || 'No actions yet.'
            }`
        )
        .setColor('Blue')
        .setThumbnail(
          `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.url}.png`
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

    await interaction.editReply({
      embeds: [generateBattleEmbed()],
      components: [generateActionButtons()],
    })

    async function handleEnemyTurn(interaction, battleState, monster, player) {
      const monsterAttacks = monster.attacks || []

      const chosenAttack = monsterAttacks[0] // Use first attack for now

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
        await interaction.editReply({
          embeds: [generateBattleEmbed(battleState, monster, player)],
          components: [],
        })
        return interaction.followUp({
          content: `💀 You were defeated by **${monster.name}**!`,
        })
      }

      battleState.turn = 'player'

      await interaction.editReply({
        embeds: [generateBattleEmbed(battleState, monster, player)],
        components: [generateActionButtons()],
      })
    }

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 60000,
    })

    collector.on('collect', async (btnInteraction) => {
      await btnInteraction.deferUpdate()
      const action = btnInteraction.customId

      if (battleState.turn === 'monster') {
        await handleEnemyTurn(interaction, battleState, monster, player)
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
          attackDamage - monster.defense * getBoostMultiplier(monster.defense),
          1
        )
        battleState.monsterHP = Math.max(battleState.monsterHP - finalDamage, 0)
        // Determine player's attack damage type
        let attackDamageType = 'physical' // Default

        if (action.startsWith('weapon_')) {
          const weaponIndex = parseInt(action.split('_')[1], 10)
          const weapon = equippedWeapons[weaponIndex]?.item
          if (weapon) {
            attackDamageType = weapon.damageType || 'physical'
          }
        }

        // Fetch correct emoji
        const attackEmoji = damageTypeEmojis[attackDamageType] || '⚔️'

        // Push battle log with correct emoji
        battleState.history.push(
          `${interaction.user.username} deals ${finalDamage} ${attackEmoji} to ${monster.name}!`
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
          fierceDamage - monster.defense * getBoostMultiplier(monster.defense),
          2
        )
        battleState.monsterHP = Math.max(battleState.monsterHP - finalFierce, 0)
        battleState.history.push(
          `${interaction.user.username} unleashes a ⚔️ fierce attack for ${finalFierce} damage!`
        )
      }

      if (battleState.monsterHP <= 0) {
        collector.stop('victory')
        return
      }

      await handleEnemyTurn(interaction, battleState, monster, player)
      battleState.turn = 'player'

      await btnInteraction.editReply({
        embeds: [generateBattleEmbed()],
        components: [generateActionButtons()],
      })
    })

    collector.on('end', async (_, reason) => {
      const resultEmbed = new EmbedBuilder()
      if (reason === 'victory') {
        resultEmbed
          .setTitle('Victory! - Battle Result')
          .setDescription(`🎉 You defeated ${monster.name}!`)
          .setColor('Green')
          .setImage(
            `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.url}.png`
          )
          .setFooter({
            text: `Arena Score: ${player.arenaScore} | Arena Ranking: 0`,
          })
          .setThumbnail(interaction.user.displayAvatarURL())
        await player.increment('arenaScore', { by: 10 })
console.log(monster)
        // 🏆 Loot Drop Calculation with Logging
        if (monster.loot && Math.random() < monster.droprate) {
          console.log(`[LOOT] Checking loot drop...`)
          console.log(
            `[LOOT] Monster Loot ID: ${monster.loot}, Drop Rate: ${monster.droprate}`
          )

          try {
            // 🔹 Find loot item by ID instead of name
            const lootItem = await BaseItem.findOne({
              where: { id: monster.loot },
            })

            if (!lootItem) {
              console.warn(
                `[LOOT] Loot item with ID ${monster.loot} not found in BaseItem!`
              )
            } else {
              console.log(
                `[LOOT] Found loot item: ${lootItem.name} (ID: ${lootItem.id})`
              )

              // Create inventory entry
              await Inventory.create({
                ArenaId: player.id,
                itemId: lootItem.id,
                equipped: false, // Not automatically equipped
              })

              console.log(`[LOOT] Added ${lootItem.name} to player inventory.`)

              resultEmbed.addFields({
                name: 'Loot Obtained!',
                value: `You received **${lootItem.name}**! 🎁`, // Use name from BaseItem
              })
            }
          } catch (error) {
            console.error(`[LOOT ERROR] Failed to award loot: ${error.message}`)
          }
        } else {
          console.log(
            `[LOOT] No loot dropped. Monster drop rate condition not met.`
          )
        }
      } else if (reason === 'defeat') {
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
      await interaction.followUp({ embeds: [resultEmbed] })
    })
  },
}
