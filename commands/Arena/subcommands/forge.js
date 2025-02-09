const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js')
const { Op } = require('sequelize')
const {
  User,
  Collection,
  MonsterItemUnlocks,
  BaseItem,
  Inventory,
} = require('../../../Models/model.js')

module.exports = {
  async execute(interaction) {
    console.log(`[FORGE] Command started by user ${interaction.user.id}`)
    const userId = interaction.user.id

    // Fetch user's collection (monsters they own)
    const userMonsters = await Collection.findAll({
      where: { userId, copies: { [Op.gt]: 0 } }, // User must have at least 1 copy
    })

    if (!userMonsters.length) {
      return interaction.reply({
        content: "You don't own any monsters that can be forged.",
        ephemeral: true,
      })
    }

    // Get a list of forgeable monster indexes
    const forgeableMonsters = await MonsterItemUnlocks.findAll()
    const forgeableMap = new Map()

    for (const unlock of forgeableMonsters) {
      forgeableMap.set(unlock.monsterIndex, unlock.baseItemId)
    }

    // Filter user monsters that are forgeable
    const validForgeable = userMonsters.filter((m) =>
      forgeableMap.has(m.name.toLowerCase())
    )

    if (!validForgeable.length) {
      return interaction.reply({
        content: "None of your monsters can be forged into weapons.",
        ephemeral: true,
      })
    }

    // Fetch all unlockable weapons
    const weaponIds = [...forgeableMap.values()]
    const weapons = await BaseItem.findAll({
      where: { id: { [Op.in]: weaponIds } },
    })

    // Map weapons by ID for quick lookup
    const weaponMap = new Map()
    weapons.forEach((weapon) => weaponMap.set(weapon.id, weapon))

    // Build the forge shop embed
    const forgeEmbed = new EmbedBuilder()
      .setTitle('⚒️ The Monster Forge')
      .setDescription(
        'Select a monster to forge into a weapon! Your monster will evolve and the weapon will be unlocked.'
      )
      .setColor('Gold')

    for (const monster of validForgeable) {
      const itemId = forgeableMap.get(monster.name.toLowerCase())
      const weapon = weaponMap.get(itemId)

      if (!weapon) continue

      forgeEmbed.addFields({
        name: `🛡️ ${weapon.name} (From: ${monster.name})`,
        value: `**Stats:** ${weapon.damageMin}-${weapon.damageMax} dmg\n**Cost:** 500 gold`,
      })
    }

    // Create dropdown for forge selection
    const forgeOptions = validForgeable.map((monster) => ({
      label: `${monster.name} → ${weaponMap.get(forgeableMap.get(monster.name.toLowerCase())).name}`,
      value: monster.name.toLowerCase(),
    }))

    const forgeDropdown = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('forge_select')
        .setPlaceholder('Select a monster to forge')
        .addOptions(forgeOptions)
    )

    await interaction.reply({
      embeds: [forgeEmbed],
      components: [forgeDropdown],
      ephemeral: true,
    })

    // Collector for the forge selection
    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 30000,
    })

    collector.on('collect', async (i) => {
      const selectedMonsterName = i.values[0]
      const selectedMonster = validForgeable.find(
        (m) => m.name.toLowerCase() === selectedMonsterName
      )

      if (!selectedMonster) {
        return i.reply({ content: "You don't own this monster.", ephemeral: true })
      }

      // Check user's gold
      const user = await User.findOne({ where: { user_id: userId } })
      if (user.gold < 500) {
        return i.reply({ content: "You don't have enough gold to forge this weapon.", ephemeral: true })
      }

      // Deduct gold
      await user.decrement('gold', { by: 500 })

      // Mark the monster as evolved
      await selectedMonster.update({ evolved: true })

      // Get the unlockable weapon
      const weaponId = forgeableMap.get(selectedMonster.name.toLowerCase())
      const weapon = weaponMap.get(weaponId)

      // Add weapon to player's inventory
      await Inventory.create({
        ArenaId: user.id,
        itemId: weapon.id,
        equipped: false,
        quantity: 1,
      })

      // Confirmation message
      await i.update({
        content: `✅ **${selectedMonster.name}** has evolved! You have unlocked **${weapon.name}**.`,
        embeds: [],
        components: [],
      })
    })

    collector.on('end', async (_, reason) => {
      if (reason !== 'collected') {
        await interaction.editReply({ components: [] })
      }
    })
  },
}
