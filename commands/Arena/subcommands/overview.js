const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js')
const fs = require('fs')
const path = require('path') // Ensure this is imported here
const { User, Inventory, BaseItem } = require('../../../Models/model.js')
const { getOrCreatePlayer } = require('../helpers/accountHelpers.js')

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

    // Helper to format attribute lines
    const formatAttribute = (label, baseValue, score, scoreLabel) => {
      const bonus = Math.floor(0.1 * score)
      return `**${label}:** ${baseValue + bonus} (+${bonus} ${scoreLabel})\n`
    }

    // Build the embed with a revised welcome message and current stats
    const generateOverviewEmbed = () => {
      let description = `Welcome to the Arena—a turn-based battlefield where your /hunt results fuel your progression. Every encounter hones your abilities while your foes grow ever more formidable, unlocking rare rewards in the Armory. Select your next action below to manage your inventory, engage in combat, or explore other areas.`

      if (player.statPoints > 0) {
        description += `\n\nYou have **${
          player.statPoints
        }** unallocated stat point${
          player.statPoints !== 1 ? 's' : ''
        }. Use the lower buttons to improve your abilities.`
      }

      description +=
        `\n\n**Current Stats:**\n` +
        `**HP:** ${player.max_hp}\n` +
        formatAttribute(
          'Strength',
          player.strength,
          userRecord.brute_score,
          'Brute'
        ) +
        formatAttribute(
          'Defense',
          player.defense,
          userRecord.stealth_score,
          'Stealth'
        ) +
        formatAttribute(
          'Intelligence',
          player.intelligence,
          userRecord.spellsword_score,
          'Spellsword'
        ) +
        formatAttribute(
          'Agility',
          player.agility,
          userRecord.stealth_score,
          'Stealth'
        ) +
        `\n**Equipped Items:**\n` +
        `- Weapons: ${equippedWeapons.join(', ') || 'None'}\n` +
        `- Defense: ${equippedDefense.join(', ') || 'None'}\n`

      return new EmbedBuilder()
        .setTitle(`${interaction.user.username}'s Arena Account`)
        .setDescription(description)
        .setFooter({
          text: `Arena Score: ${player.arenaScore} | Arena Ranking: #0`,
        })
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor('Blue')
    }

    // Navigation row: buttons to access pages
    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('nav_inventory')
        .setLabel('Inventory')
        .setStyle('Secondary'),
      new ButtonBuilder()
        .setCustomId('nav_fight')
        .setLabel('Fight')
        .setStyle('Secondary'),
      new ButtonBuilder()
        .setCustomId('nav_forge')
        .setLabel('Forge')
        .setStyle('Secondary'),
      new ButtonBuilder()
        .setCustomId('nav_temple')
        .setLabel('Temple')
        .setStyle('Secondary')
    )

    // Stat allocation row: only visible when unspent stat points exist
    const statRow = new ActionRowBuilder().addComponents(
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

    await interaction.reply({
      embeds: [generateOverviewEmbed()],
      components: player.statPoints > 0 ? [navRow, statRow] : [navRow],
      ephemeral: true,
    })

    // Set up a component collector to handle button interactions
    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 60000,
    })

    collector.on('collect', async (btnInteraction) => {
      const customId = btnInteraction.customId

      // Navigation buttons
      if (customId.startsWith('nav_')) {
        if (customId === 'nav_inventory') {
          const inventorySubcommandFile = path.join(__dirname, 'inventory.js')
          if (fs.existsSync(inventorySubcommandFile)) {
            const inventoryCommand = require(inventorySubcommandFile)
            await inventoryCommand.execute(btnInteraction)
            collector.stop()
          } else {
            await btnInteraction.reply({
              content: 'Inventory subcommand not implemented yet.',
              ephemeral: true,
            })
          }
          return
        } else if (customId === 'nav_fight') {
          const fightSubcommandFile = path.join(__dirname, 'fight.js')
          if (fs.existsSync(fightSubcommandFile)) {
            const fightCommand = require(fightSubcommandFile)
            await fightCommand.execute(btnInteraction)
            collector.stop()
          } else {
            await btnInteraction.reply({
              content: 'Fight subcommand not implemented yet.',
              ephemeral: true,
            })
          }
          return
        } else if (customId === 'nav_forge') {
            const fightSubcommandFile = path.join(__dirname, 'forge.js')
            if (fs.existsSync(fightSubcommandFile)) {
              const fightCommand = require(fightSubcommandFile)
              await fightCommand.execute(btnInteraction)
              collector.stop()
            } else {
              await btnInteraction.reply({
                content: 'Forge subcommand not implemented yet.',
                ephemeral: true,
              })
            }
            return
         } else if (customId === 'nav_temple') {
            const fightSubcommandFile = path.join(__dirname, 'temple.js')
            if (fs.existsSync(fightSubcommandFile)) {
              const fightCommand = require(fightSubcommandFile)
              await fightCommand.execute(btnInteraction)
              collector.stop()
            } else {
              await btnInteraction.reply({
                content: 'Temple subcommand not implemented yet.',
                ephemeral: true,
              })
            }
            return
         } else {
          await btnInteraction.reply({
            content: 'Unknown navigation option.',
            ephemeral: true,
          })
          return
        }
      }

      // Stat allocation buttons
      if (
        ['hp', 'strength', 'defense', 'intelligence', 'agility'].includes(
          customId
        )
      ) {
        if (player.statPoints > 0) {
          await player.increment(customId, { by: 1 })
          await player.decrement('statPoints', { by: 1 })
          await player.reload()
        }
        await btnInteraction.update({
          embeds: [generateOverviewEmbed()],
          components: player.statPoints > 0 ? [navRow, statRow] : [navRow],
        })
        if (player.statPoints === 0) collector.stop()
      }
    })

    collector.on('end', async () => {
      await interaction.editReply({ components: [] })
    })
  },
}
