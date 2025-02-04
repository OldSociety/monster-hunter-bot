const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} = require('discord.js')
const {
  User,
  Arena,
  ArenaMonster,
  Inventory,
  BaseItem,
  PlayerProgressStat,
} = require('../../Models/model.js')

const STAT_BOOSTS = [
  { threshold: 750, multiplier: 16 },
  { threshold: 700, multiplier: 15 },
  { threshold: 650, multiplier: 14 },
  { threshold: 600, multiplier: 13 },
  { threshold: 550, multiplier: 12 },
  { threshold: 500, multiplier: 11 },
  { threshold: 450, multiplier: 9.75 },
  { threshold: 400, multiplier: 8.5 },
  { threshold: 350, multiplier: 7.5 },
  { threshold: 300, multiplier: 6.5 },
  { threshold: 250, multiplier: 5.5 },
  { threshold: 200, multiplier: 4.5 },
  { threshold: 125, multiplier: 3 },
  { threshold: 85, multiplier: 2.5 },
  { threshold: 55, multiplier: 2 },
  { threshold: 35, multiplier: 1.5 },
  { threshold: 20, multiplier: 1.25 },
  { threshold: 13, multiplier: 1 },
  { threshold: 8, multiplier: 0.75 },
  { threshold: 0, multiplier: 0.5 },
]

// Returns the boost multiplier for a given stat value.
function getBoostMultiplier(stat) {
  for (const boost of STAT_BOOSTS) {
    if (stat >= boost.threshold) return boost.multiplier
  }
  return 0.5
}

// Determine the first turn based on agility.
function determineFirstTurn(playerAgi, monsterAgi) {
  const total = playerAgi + monsterAgi
  return Math.random() < playerAgi / total ? 'player' : 'monster'
}

// Damage calculation based on agility swing.
function calculateDamageWithAgility(dMin, dMax, attackerAgi, defenderAgi) {
  const maxEffect = 0.9
  const k = 0.01
  const attackerEffect = maxEffect * (1 - Math.exp(-k * attackerAgi))
  const defenderEffect = maxEffect * (1 - Math.exp(-k * defenderAgi))
  const effectiveSwing = attackerEffect - defenderEffect
  const range = dMax - dMin
  return Math.floor(dMin + range * (0.5 + effectiveSwing / 2))
}

// Retrieve (or create) a player's Arena record.
async function getOrCreatePlayer(userId) {
  try {
    let player = await Arena.findOne({ where: { userId } })
    if (!player) {
      player = await Arena.create({
        userId,
        hp: 5,
        strength: 4,
        defense: 4,
        intelligence: 4,
        agility: 4,
        statPoints: 10,
      })
    }
    return player
  } catch (error) {
    console.error(`Error in getOrCreatePlayer: ${error.message}`)
    throw new Error('Could not retrieve or create player.')
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('arena')
    .setDescription('Manage your Arena and battle!')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('overview')
        .setDescription('View or allocate stats for your Arena account.')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('fight').setDescription('Kill or be killed!')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('inventory')
        .setDescription('View and manage your inventory.')
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Filter by item type.')
            .addChoices(
              { name: 'Weapons', value: 'weapon' },
              { name: 'Defense', value: 'defense' },
              { name: 'Consumables', value: 'consumable' }
            )
        )
    ),

  async execute(interaction) {
    console.log('test')
    const allowedChannels = [
      // process.env.WINTERCHANNELID,
      process.env.DEVBOTTESTCHANNELID,
    ]

    if (!allowedChannels.includes(interaction.channel.id)) {
      await interaction.reply({
        content: `This command can only be used in the designated Arena channels.`,
        ephemeral: true,
      })
      return
    }

    const userId = interaction.user.id
    const subcommand = interaction.options.getSubcommand()
    // Retrieve the latest style scores from the User model.
const userRecord = await User.findOne({ where: { user_id: userId } });

// Retrieve (or create) the player's ArenaAccounts record.
let player = await getOrCreatePlayer(userId);

// Calculate bonus values using Math.floor.
const bonusStrength = Math.floor(0.1 * userRecord.brute_score);
const bonusDefense = Math.floor(0.1 * userRecord.stealth_score);
const bonusAgility = Math.floor(0.1 * userRecord.stealth_score);
const bonusIntelligence = Math.floor(0.1 * userRecord.spellsword_score);

// Compute new effective attributes.
const newEffectiveStrength = player.strength + bonusStrength;
const newEffectiveDefense = player.defense + bonusDefense;
const newEffectiveAgility = player.agility + bonusAgility;
const newEffectiveIntelligence = player.intelligence + bonusIntelligence;

// Update the ArenaAccounts record if any effective value has changed.
if (
  player.effective_strength !== newEffectiveStrength ||
  player.effective_defense !== newEffectiveDefense ||
  player.effective_agility !== newEffectiveAgility ||
  player.effective_intelligence !== newEffectiveIntelligence
) {
  await player.update({
    effective_strength: newEffectiveStrength,
    effective_defense: newEffectiveDefense,
    effective_agility: newEffectiveAgility,
    effective_intelligence: newEffectiveIntelligence,
  });
  console.log('Updated effective attributes:', {
    effective_strength: newEffectiveStrength,
    effective_defense: newEffectiveDefense,
    effective_agility: newEffectiveAgility,
    effective_intelligence: newEffectiveIntelligence,
  });
}

    if (subcommand === 'overview') {
      const player = await getOrCreatePlayer(userId)

      const equippedItems = await Inventory.findAll({
        where: { ArenaId: player.id, equipped: true },
        include: { model: BaseItem, as: 'item' },
        logging: console.log,
      })

      const equippedWeapons = equippedItems
        .filter((item) => item.item.type === 'weapon')
        .map((item) => item.item.name)

      const equippedDefense = equippedItems
        .filter((item) => item.item.type === 'defense')
        .map((item) => item.item.name)

      const generateStatEmbed = () => {
        // Helper function to format attribute descriptions
const formatAttribute = (label, baseValue, score, scoreLabel) => {
    const bonus = Math.floor(0.1 * score);
    return `**${label}:** ${baseValue + bonus} (+ ${bonus} from ${scoreLabel})\n`;
  };
  
  // Constructing the description using the helper function
  let description =
    `**HP:** ${player.hp}\n` +
    formatAttribute("Strength", player.strength, userRecord.brute_score, "Brute Score") +
    formatAttribute("Defense", player.defense, userRecord.stealth_score, "Stealth Score") +
    formatAttribute("Intelligence", player.intelligence, userRecord.spellsword_score, "Spellsword Score") +
    formatAttribute("Agility", player.agility, userRecord.stealth_score, "Stealth Score") +
    `\n**Equipped Items:**\n` +
    `- Weapons: ${equippedWeapons.join(", ") || "None"}\n` +
    `- Defense: ${equippedDefense.join(", ") || "None"}\n`;
  

        if (player.statPoints > 0) {
          description =
            `Welcome to Arena! You have **${player.statPoints} points** to distribute among the following stats:\n\n` +
            `**HP:** How much damage you can take before defeat.\n` +
            `**Strength:** How much damage you deal to enemies.\n` +
            `**Defense:** How much damage you can block.\n` +
            `**Intelligence:** Unlocks new attacks and abilities.\n` +
            `**Agility:** How fast you act and crit attacks.\n` +
            `Use the buttons below to allocate your points!\n\n` +
            description +
            `\n**Unallocated Points:** ${player.statPoints}\n\n`
        }

        return new EmbedBuilder()
          .setTitle(`${interaction.user.username}'s Arena Account`)
          .setDescription(description)
          .setFooter({
            text: `Arena Score: ${player.arenaScore} | Arena Ranking`,
          })
          .setThumbnail(interaction.user.displayAvatarURL())
          .setColor('Blue')
      }

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('hp')
          .setLabel('HP +1')
          .setStyle('Primary'),
        new ButtonBuilder()
          .setCustomId('strength')
          .setLabel('Strength +1')
          .setStyle('Primary'),
        new ButtonBuilder()
          .setCustomId('defense')
          .setLabel('Defense +1')
          .setStyle('Primary'),
        new ButtonBuilder()
          .setCustomId('intelligence')
          .setLabel('Intelligence +1')
          .setStyle('Primary'),
        new ButtonBuilder()
          .setCustomId('agility')
          .setLabel('Agility +1')
          .setStyle('Primary')
      )

      const components = player.statPoints > 0 ? [actionRow] : []

      try {
        await interaction.reply({
          embeds: [generateStatEmbed()],
          components,
          ephemeral: true,
        })
      } catch (error) {
        console.error(`Error sending reply: ${error.message}`)
      }

      if (player.statPoints > 0) {
        const collector = interaction.channel.createMessageComponentCollector({
          filter: (i) => i.user.id === userId,
          time: 60000,
        })

        collector.on('collect', async (btnInteraction) => {
          const stat = btnInteraction.customId

          if (player.statPoints > 0) {
            await player.increment(stat, { by: 1 })
            await player.decrement('statPoints', { by: 1 })
            await player.reload()
          }

          await btnInteraction.update({
            embeds: [generateStatEmbed()],
            components: player.statPoints > 0 ? [actionRow] : [],
          })

          if (player.statPoints === 0) {
            collector.stop()
          }
        })

        collector.on('end', async () => {
          await interaction.editReply({
            components: [],
          })
        })
      }
    } else if (subcommand === 'inventory') {
      let itemType = interaction.options.getString('type') // Initial type
      const player = await getOrCreatePlayer(userId)

      const inventoryItems = await Inventory.findAll({
        where: { ArenaId: player.id },
        include: { model: BaseItem, as: 'item' },
      })

      const damageTypeEmojis = {
        physical: '✊', // Sword
        cold: '❄️', // Snowflake
        fire: '🔥', // Fire
        water: '🌊', // Wave
        acid: '☣️', // Test tube
        earth: '🪨', // Earth globe
      }

      const filterItems = () =>
        inventoryItems.filter((item) => item.item.type === itemType)

      let filteredItems = filterItems()
      if (!filteredItems.length) {
        await interaction.reply({
          content: `No items found in the '${itemType}' category.`,
          ephemeral: true,
        })
        return
      }

      const itemsPerPage = 10
      let currentPage = 0

      const createEmbed = (page) => {
        const paginatedItems = filteredItems.slice(
          page * itemsPerPage,
          (page + 1) * itemsPerPage
        )

        const embed = new EmbedBuilder()
          .setTitle(`${interaction.user.username}'s Inventory (${itemType})`)
          .setColor('Green')
          .setFooter({
            text: `Equipped: ${player.equippedCount}/2 | Page ${
              page + 1
            } of ${Math.ceil(filteredItems.length / itemsPerPage)}`,
          })

        paginatedItems.forEach((item, index) => {
          const details = []

          if (item.item.damageMin && item.item.damageMax) {
            const avgDamage = (item.item.damageMin + item.item.damageMax) / 2

            // Fetch the emoji and label for the damage type
            const damageEmoji =
              damageTypeEmojis[item.item.damageType] ||
              damageTypeEmojis['physical']
            const damageTypeLabel = item.item.damageType
              ? `${item.item.damageType
                  .charAt(0)
                  .toUpperCase()}${item.item.damageType.slice(1)}`
              : 'Physical' // Default to Physical if no type is specified

            // Push formatted damage detail to details array
            details.push(
              `• Damage: ${Math.floor(
                avgDamage
              )} ${damageTypeLabel} ${damageEmoji}`
            )
          }

          if (item.item.healing) {
            details.push(`• Healing: ${item.item.healing}`)
          }

          if (item.item.defense) {
            details.push(
              `• Defense: ${item.item.defense} (${
                item.item.damageType || 'General'
              })`
            )
          }

          embed.addFields({
            name: `${index + 1 + page * itemsPerPage}. ${item.item.name} ${
              item.equipped ? '✅' : ''
            }`,
            value: details.length ? details.join('\n') : 'No additional stats.',
            inline: false,
          })
        })

        return embed
      }

      const createButtons = (page) => {
        const typeSwitchButton = new ButtonBuilder()
          .setCustomId('switch_type')
          .setLabel(
            itemType === 'weapon'
              ? 'Switch to Defense'
              : itemType === 'defense'
              ? 'Switch to Consumables'
              : 'Switch to Weapons'
          )
          .setStyle(
            itemType === 'weapon'
              ? 'Primary'
              : itemType === 'defense'
              ? 'Secondary'
              : 'Success'
          )

        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('previous')
            .setLabel('Previous')
            .setStyle('Secondary')
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle('Secondary')
            .setDisabled((page + 1) * itemsPerPage >= filteredItems.length),
          typeSwitchButton,
          new ButtonBuilder()
            .setCustomId('finish')
            .setLabel('Finish')
            .setStyle('Danger')
        )
      }

      const createDropdown = (page) => {
        const paginatedItems = filteredItems.slice(
          page * itemsPerPage,
          (page + 1) * itemsPerPage
        )

        const options = paginatedItems.map((item) => ({
          label: `${item.item.name} ${item.equipped ? '✅ Equipped' : ''}`,
          description: item.item.type,
          value: `${item.id}`,
        }))

        return new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('equip_dropdown')
            .setPlaceholder('Select an item to equip/unequip')
            .addOptions(options)
        )
      }

      let canEquip = itemType === 'weapon' || itemType === 'defense'

      await interaction.reply({
        embeds: [createEmbed(currentPage)],
        components: [
          createButtons(currentPage),
          ...(canEquip ? [createDropdown(currentPage)] : []),
        ],
        ephemeral: true,
      })

      const collector = interaction.channel.createMessageComponentCollector({
        time: 60000,
      })

      collector.on('collect', async (btnInteraction) => {
        try {
          if (btnInteraction.user.id !== interaction.user.id) {
            await btnInteraction.reply({
              content: "This interaction isn't for you.",
              ephemeral: true,
            })
            return
          }

          await btnInteraction.deferUpdate()

          if (btnInteraction.customId === 'finish') {
            collector.stop('finished')
            await interaction.editReply({
              content: 'Inventory management session ended.',
              components: [],
            })
            return
          }

          if (btnInteraction.customId === 'switch_type') {
            itemType =
              itemType === 'weapon'
                ? 'defense'
                : itemType === 'defense'
                ? 'consumable'
                : 'weapon'

            filteredItems = filterItems()
            currentPage = 0
          } else if (btnInteraction.customId === 'previous') {
            currentPage = Math.max(currentPage - 1, 0)
          } else if (btnInteraction.customId === 'next') {
            currentPage = Math.min(
              currentPage + 1,
              Math.ceil(filteredItems.length / itemsPerPage) - 1
            )
          } else if (btnInteraction.customId === 'equip_dropdown') {
            const selectedItemId = btnInteraction.values[0]
            const selectedItem = filteredItems.find(
              (item) => item.id.toString() === selectedItemId
            )

            if (!selectedItem) {
              await btnInteraction.followUp({
                content: 'Selected item not found.',
                ephemeral: true,
              })
              return
            }

            if (selectedItem.equipped) {
              await Inventory.update(
                { equipped: false },
                { where: { id: selectedItem.id } }
              )
              await Arena.increment('equippedCount', {
                by: -1,
                where: { id: player.id },
              })

              // Update locally
              selectedItem.equipped = false
            } else {
              if (player.equippedCount >= 2) {
                await btnInteraction.followUp({
                  content: `You cannot equip more than 2 items at a time.`,
                  ephemeral: true,
                })
                return
              }

              await Inventory.update(
                { equipped: true },
                { where: { id: selectedItem.id } }
              )
              await Arena.increment('equippedCount', {
                by: 1,
                where: { id: player.id },
              })

              // Update locally
              selectedItem.equipped = true
            }

            player.equippedCount = await Arena.sum('equippedCount', {
              where: { id: player.id },
            })
          }

          // Update the embed with the local state
          await btnInteraction.editReply({
            embeds: [createEmbed(currentPage)],
            components: [
              createButtons(currentPage),
              ...(itemType === 'weapon' || itemType === 'defense'
                ? [createDropdown(currentPage)]
                : []),
            ],
          })
        } catch (error) {
          console.error('Error handling interaction:', error)
          if (!btnInteraction.replied) {
            await btnInteraction.reply({
              content: 'An error occurred. Please try again.',
              ephemeral: true,
            })
          }
        }
      })

      collector.on('end', async () => {
        await interaction.editReply({
          components: [],
        })
      })
    } else if (subcommand === 'fight') {
      // Fetch the player's Arena record...
      const player = await Arena.findOne({ where: { userId } })
      if (!player) {
        await interaction.reply({
          content:
            'You need to create an account first! Use `/arena overview` to get started.',
          ephemeral: true,
        })
        return
      }

      // Compute effective attributes:
      const effectiveStrength =
        player.strength + (4 + Math.floor(0.1 * userRecord.brute_score))
      const effectiveDefense =
        player.defense + (4 + Math.floor(0.1 * userRecord.stealth_score))
      const effectiveAgility =
        player.agility + (4 + Math.floor(0.1 * userRecord.stealth_score))
      const effectiveIntelligence =
        player.intelligence +
        (4 + Math.floor(0.1 * userRecord.spellsword_score))

      const damageTypeEmojis = {
        physical: '✊',
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

      // Fetch a random monster.
      let monster
      try {
        await interaction.deferReply({ ephemeral: true })
        const monsters = await ArenaMonster.findAll()
        if (!monsters || monsters.length === 0) {
          await interaction.editReply({
            content: 'No monsters available. Please try again later!',
          })
          return
        }
        monster = monsters[Math.floor(Math.random() * monsters.length)]
        if (!monster) {
          await interaction.editReply({
            content: 'No monsters available. Please try again later!',
          })
          return
        }
        await interaction.editReply({
          content: `You are battling **${monster.name}**! Prepare for combat!`,
        })
      } catch (error) {
        console.error(`Error fetching monster: ${error.message}`)
        await interaction.editReply({
          content:
            'An error occurred while starting the battle. Please try again later.',
        })
        return
      }

      // Decide turn order using effective agility.
      const firstTurn = determineFirstTurn(effectiveAgility, monster.agility)
      const battleState = {
        playerHP: player.hp,
        monsterHP: monster.hp,
        history: [],
        turn: firstTurn,
        defenseModifier: 1,
      }
      battleState.history.push(
        firstTurn === 'player'
          ? '🎯 You get the first attack!'
          : `🎯 ${monster.name} gets the first attack!`
      )

      // Helper: Generate the battle embed.
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

      // Helper: Create action buttons for the player's turn.
      const generateActionButtons = () => {
        const row = new ActionRowBuilder()
        if (equippedWeapons.length > 0) {
          equippedWeapons.forEach((weapon, index) => {
            // Calculate base damage swing using effective agility.
            const baseSwing = calculateDamageWithAgility(
              weapon.item.damageMin,
              weapon.item.damageMax,
              effectiveAgility,
              monster.agility
            )
            // Multiply by a factor based on effective strength (for physical attacks).
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

      // Send the initial battle embed.
      await interaction.editReply({
        embeds: [generateBattleEmbed()],
        components: [generateActionButtons()],
      })

      // Create a collector to handle button interactions.
      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === userId,
        time: 60000,
      })

      collector.on('collect', async (btnInteraction) => {
        if (battleState.turn !== 'player') {
          await btnInteraction.reply({
            content: "It's not your turn!",
            ephemeral: true,
          })
          return
        }
        await btnInteraction.deferUpdate()
        const action = btnInteraction.customId
        // Basic Attack (if no weapon equipped)
        if (action === 'basic_attack') {
          const baseSwing = calculateDamageWithAgility(
            1,
            2,
            effectiveAgility,
            monster.agility
          )
          const attackDamage = Math.floor(baseSwing * (effectiveStrength / 10))
          // Subtract monster defense (scaled by its boost multiplier)
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
            `${interaction.user.username} deals ${finalDamage} ✊ to ${monster.name}!`
          )
        }
        // Fierce Attack
        else if (action === 'fierce_attack') {
          let baseSwing = 0
          if (equippedWeapons.length > 0) {
            baseSwing = equippedWeapons.reduce((total, weapon) => {
              const swing = calculateDamageWithAgility(
                weapon.item.damageMin,
                weapon.item.damageMax,
                effectiveAgility,
                monster.agility
              )
              return total + swing
            }, 0)
          } else {
            baseSwing = calculateDamageWithAgility(
              1,
              2,
              effectiveAgility,
              monster.agility
            )
          }
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
            `${interaction.user.username} unleashes a fierce attack for ${finalFierce} damage!`
          )
          // Optionally, adjust defense modifier based on equipped weapons here.
        }
        // Weapon-specific attack (if action starts with "weapon_")
        else if (action.startsWith('weapon_')) {
          const weaponIndex = parseInt(action.split('_')[1], 10)
          const weapon = equippedWeapons[weaponIndex].item
          const baseSwing = calculateDamageWithAgility(
            weapon.damageMin,
            weapon.damageMax,
            effectiveAgility,
            monster.agility
          )
          const weaponDamage = Math.floor(baseSwing * (effectiveStrength / 10))
          battleState.monsterHP = Math.max(
            battleState.monsterHP - weaponDamage,
            0
          )
          const dmgEmoji = damageTypeEmojis[weapon.damageType] || ''
          battleState.history.push(
            `${interaction.user.username} uses ${weapon.name} to deal ${weaponDamage}${dmgEmoji} to ${monster.name}!`
          )
        }

        // Check if the monster is defeated.
        if (battleState.monsterHP <= 0) {
          collector.stop('victory')
          return
        }

        // Now, simulate the monster's turn.
        // (For brevity, we use a simple retaliation attack.)
        const monsterAttack = calculateDamageWithAgility(
          weapon ? 5 : 5,
          10,
          monster.agility,
          effectiveAgility
        )
        const finalMonsterDamage = Math.max(
          monsterAttack - monster.defense * getBoostMultiplier(monster.defense),
          1
        )
        battleState.playerHP = Math.max(
          battleState.playerHP - finalMonsterDamage,
          0
        )
        battleState.history.push(
          `${monster.name} strikes back for ${finalMonsterDamage} damage!`
        )

        if (battleState.playerHP <= 0) {
          collector.stop('defeat')
          return
        }

        battleState.turn = 'player'
        await btnInteraction.editReply({
          embeds: [generateBattleEmbed()],
          components: [generateActionButtons()],
        })
      })

      collector.on('end', async (collected, reason) => {
        const resultEmbed = new EmbedBuilder().setTitle('Battle Result')
        if (reason === 'victory') {
          resultEmbed
            .setDescription(`🎉 You defeated ${monster.name}!`)
            .setColor('Green')
            .setImage(
              `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.url}.png`
            )
          // Increment player's arenaScore or award points.
          await player.increment('arenaScore', { by: 10 })
        } else if (reason === 'defeat') {
          resultEmbed
            .setDescription(`💔 You were defeated by ${monster.name}.`)
            .setColor('Red')
            .setThumbnail(
              `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/refs/heads/main/assets/${monster.url}.png`
            )
        } else {
          resultEmbed
            .setDescription('⏳ The battle ended due to inactivity.')
            .setColor('Grey')
        }
        await interaction.followUp({ embeds: [resultEmbed] })
      })
    }
  },
}
