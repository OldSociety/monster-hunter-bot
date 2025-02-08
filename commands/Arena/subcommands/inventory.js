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
    // If interaction.options exists (slash command), use it; otherwise default to 'weapon'
    let itemType =
      interaction.options && typeof interaction.options.getString === 'function'
        ? interaction.options.getString('type') || 'weapon'
        : 'weapon'

    const inventoryItems = await Inventory.findAll({
      where: { ArenaId: player.id },
      include: { model: BaseItem, as: 'item' },
    })

    const availableTypes = []
    if (inventoryItems.some((i) => i.item.type === 'weapon'))
      availableTypes.push('weapon')
    if (inventoryItems.some((i) => i.item.type === 'defense'))
      availableTypes.push('defense')
    if (inventoryItems.some((i) => i.item.type === 'consumable'))
      availableTypes.push('consumable')

    let filteredItems = inventoryItems.filter(
      (item) => item.item.type === itemType
    )
    if (filteredItems.length === 0) {
      for (const type of ['weapon', 'defense', 'consumable']) {
        const itemsForType = inventoryItems.filter(
          (item) => item.item.type === type
        )
        if (itemsForType.length > 0) {
          itemType = type
          filteredItems = itemsForType
          break
        }
      }
    }
    if (filteredItems.length === 0) {
      await interaction.reply({
        content: `No items found in your inventory.`,
        ephemeral: true,
      })
      return
    }

    if (itemType === 'consumable') {
      const grouped = {}
      filteredItems.forEach((item) => {
        const quantity = item.quantity || 1
        const key = item.item.id
        if (!grouped[key]) grouped[key] = { ...item, count: quantity }
        else grouped[key].quantity += quantity
      })
      filteredItems = Object.values(grouped).filter((item) => item.quantity > 0)
    }

    const damageTypeEmojis = {
      physical: '⚔️',
      cold: '❄️',
      fire: '🔥',
      acid: '☣️',
      lightning: '⚡',
      necrotic: '☠️',
      radiant: '✨',
    }
    let currentPage = 0
    const itemsPerPage = 10

    const createEmbed = (page) => {
      const paginatedItems = filteredItems.slice(
        page * itemsPerPage,
        (page + 1) * itemsPerPage
      )
      const embed = new EmbedBuilder()
        .setTitle(
          `Arena Inventory - ${itemType[0].toUpperCase() + itemType.slice(1)}`
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor('Green')
        .setFooter({
          text: `Equipped: ${player.equippedCount}/2 | Page ${
            page + 1
          } of ${Math.ceil(filteredItems.length / itemsPerPage)}`,
        })

      paginatedItems.forEach((item, index) => {
        const details = []
        if (
          typeof item.item.damageMin === 'number' &&
          typeof item.item.damageMax === 'number'
        ) {
          const avgDamage = (item.item.damageMin + item.item.damageMax) / 2
          const damageEmoji = damageTypeEmojis[item.item.damageType] || '⚔️'
          details.push(`• Damage: ${Math.floor(avgDamage)} ${damageEmoji}`)
        }
        let defenseDetail = ''
        try {
          const defenseArr = JSON.parse(item.item.defense)
          if (Array.isArray(defenseArr) && defenseArr.length > 0) {
            const defenseObj = defenseArr[0]
            const defenseStats = []
            for (const [key, value] of Object.entries(defenseObj)) {
              if (value > 0) defenseStats.push(`${key}: ${value}`)
            }
            if (defenseStats.length > 0)
              defenseDetail = `• Defense: ${defenseStats.join(', ')}`
          }
        } catch (e) {}
        if (defenseDetail) details.push(defenseDetail)
        if (typeof item.item.healing === 'number' && item.item.healing > 0) {
          details.push(`• Healing: ${item.item.healing}`)
        }
        try {
          const effectsArr = JSON.parse(item.item.effects)
          if (Array.isArray(effectsArr)) {
            effectsArr.forEach((effect) => {
              if (effect.type && effect.chance > 0) {
                let effectDetail = `• Effect: ${effect.type}`
                if (effect.chance)
                  effectDetail += ` | Chance: ${Math.round(
                    effect.chance * 100
                  )}%`
                if (effect.duration)
                  effectDetail += ` | Duration: ${effect.duration}`
                if (effect.stat) effectDetail += ` | Stat: ${effect.stat}`
                details.push(effectDetail)
              }
            })
          }
        } catch (e) {}

        const fieldName =
          itemType === 'consumable'
            ? `${index + 1 + page * itemsPerPage}. ${item.item.name} (${
                item.quantity
              })${item.equipped ? ' ✅' : ''}`
            : `${index + 1 + page * itemsPerPage}. ${item.item.name}${
                item.equipped ? ' ✅' : ''
              }`
        embed.addFields({
          name: fieldName,
          value: details.length ? details.join('\n') : 'No additional stats.',
          inline: false,
        })
      })
      return embed
    }

    const createButtons = (page) => {
      const buttons = [
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
      ]
      if (availableTypes.length > 1) {
        let nextType
        if (itemType === 'weapon' && availableTypes.includes('defense'))
          nextType = 'defense'
        else if (
          itemType === 'defense' &&
          availableTypes.includes('consumable')
        )
          nextType = 'consumable'
        else if (itemType === 'consumable' && availableTypes.includes('weapon'))
          nextType = 'weapon'
        else nextType = availableTypes.find((t) => t !== itemType)
        if (nextType)
          buttons.push(
            new ButtonBuilder()
              .setCustomId('switch_type')
              .setLabel(
                `Switch to ${nextType[0].toUpperCase() + nextType.slice(1)}`
              )
              .setStyle('Primary')
          )
      }
      buttons.push(
        new ButtonBuilder()
          .setCustomId('finish')
          .setLabel('Finish')
          .setStyle('Danger')
      )
      return new ActionRowBuilder().addComponents(...buttons)
    }

    const createDropdown = (page) => {
      const paginatedItems = filteredItems.slice(
        page * itemsPerPage,
        (page + 1) * itemsPerPage
      )
      const options = paginatedItems.map((item) => {
        let optionLabel = `${item.item.name}${item.equipped ? ' ✅' : ''}`
        if (optionLabel.length > 25)
          optionLabel = optionLabel.slice(0, 22) + '...'
        return {
          label: optionLabel,
          description: item.item.type,
          value: `${item.id}`,
        }
      })
      return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('equip_dropdown')
          .setPlaceholder('Select an item')
          .addOptions(options)
      )
    }

    const canEquip = itemType === 'weapon' || itemType === 'defense'
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
      if (btnInteraction.user.id !== interaction.user.id) {
        if (!btnInteraction.replied)
          await btnInteraction.reply({
            content: "This isn't for you.",
            ephemeral: true,
          })
        return
      }
      try {
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
          const nextType = btnInteraction.component.label
            .split(' ')[2]
            .toLowerCase()
          itemType = nextType
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
                content: 'You cannot equip more than 2 items at a time.',
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
        let newFilteredItems = inventoryItems.filter(
          (item) => item.item.type === itemType
        )
        if (itemType === 'consumable') {
          const grouped = {}
          newFilteredItems.forEach((item) => {
            const quantity = item.quantity || 1
            const key = item.item.id
            if (!grouped[key]) grouped[key] = { ...item, count: quantity }
            else grouped[key].quantity += quantity
          })
          newFilteredItems = Object.values(grouped).filter(
            (item) => item.quantity > 0
          )
        }
        filteredItems = newFilteredItems
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
      }
    })
    collector.on('end', async () => {
      await interaction.editReply({ components: [] })
    })
  },
}
