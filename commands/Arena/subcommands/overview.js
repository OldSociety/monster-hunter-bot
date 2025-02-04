const { EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js')
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

    const generateStatEmbed = () => {
      // Helper function to format attribute descriptions
      const formatAttribute = (label, baseValue, score, scoreLabel) => {
        const bonus = Math.floor(0.1 * score)
        return `**${label}:** ${baseValue + bonus} (+ ${bonus} ${scoreLabel})\n`
      }

      // Constructing the description using the helper function
      let description =
        `**HP:** ${player.hp}\n` +
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
          text: `Arena Score: ${player.arenaScore} | Arena Ranking: 0`,
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

    await interaction.reply({
      embeds: [generateStatEmbed()],
      components: player.statPoints > 0 ? [actionRow] : [],
      ephemeral: true,
    })

    // Stat allocation handling
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
        embeds: [embed],
        components: player.statPoints > 0 ? [actionRow] : [],
      })

      if (player.statPoints === 0) collector.stop()
    })

    collector.on('end', async () => {
      await interaction.editReply({ components: [] })
    })
  },
}
