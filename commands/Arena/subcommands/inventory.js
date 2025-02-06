const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
} = require('discord.js')
const { User, Inventory, BaseItem, Arena } = require('../../../Models/model.js')
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
    let itemType = interaction.options.getString('type') || 'weapon'

    // Fetch player's inventory filtered by type
    const inventoryItems = await Inventory.findAll({
      where: { ArenaId: player.id },
      include: { model: BaseItem, as: 'item' },
    })

    const filteredItems = inventoryItems.filter(
      (item) => item.item.type === itemType
    )

    if (filteredItems.length === 0) {
      await interaction.reply({
        content: `No items found in the '${itemType}' category.`,
        ephemeral: true,
      })
      return
    }

    // Damage type emojis for weapons
    const damageTypeEmojis = {
      physical: '✊',
      cold: '❄️',
      fire: '🔥',
      water: '🌊',
      acid: '☣️',
      earth: '🪨',
    }

    let currentPage = 0
    const itemsPerPage = 10

    // Generate inventory embed
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
          const damageEmoji = damageTypeEmojis[item.item.damageType] || '⚔️'
          details.push(`• Damage: ${Math.floor(avgDamage)} ${damageEmoji}`)
        }
        if (item.item.defense) {
          details.push(`• Defense: ${item.item.defense}`)
        }
        if (item.item.healing) {
          details.push(`• Healing: ${item.item.healing}`)
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

    // Buttons for pagination and type switching
    const createButtons = (page) => {
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
        new ButtonBuilder()
          .setCustomId('switch_type')
          .setLabel(
            itemType === 'weapon'
              ? 'Switch to Defense'
              : itemType === 'defense'
              ? 'Switch to Consumables'
              : 'Switch to Weapons'
          )
          .setStyle('Primary'),
        new ButtonBuilder()
          .setCustomId('finish')
          .setLabel('Finish')
          .setStyle('Danger')
      )
    }

    // Dropdown for equipping/unequipping items
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
            selectedItem.equipped = true
          }

          player.equippedCount = await Arena.sum('equippedCount', {
            where: { id: player.id },
          })
        }

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
      await interaction.editReply({ components: [] })
    })
  },
}
