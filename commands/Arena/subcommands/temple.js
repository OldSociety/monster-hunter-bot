const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
} = require('discord.js')
const { User } = require('../../../Models/model.js')
const { getOrCreatePlayer } = require('../helpers/accountHelpers.js')
const { collectors, stopUserCollector } = require('../../../utils/collectors')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('temple')
    .setDescription('Heal at the temple'),

  async execute(interaction) {
    console.log(
      `[TEMPLE] Temple command started by user ${interaction.user.id}`
    )
    const userId = interaction.user.id
    // Stop any existing collector for this user.
    stopUserCollector(userId)

    // Get the player's arena profile (which includes hp and maxHp)
    const player = await getOrCreatePlayer(userId)
    // Load the user for currency info.
    const user = await User.findOne({ where: { user_id: userId } })
    if (!user) {
      await interaction.reply({
        content: 'Please create an account first using /account.',
        ephemeral: true,
      })
      return
    }

    const currentHP = player.current_hp
    const maxHP = player.max_hp || 5 // Default max if not defined.
    const missingHP = maxHP - currentHP

    // Prepare healing buttons.
    // Button 1: Heal 3 HP for 1 token.
    const healOne = new ButtonBuilder()
      .setCustomId('heal_1')
      .setLabel('Heal 3 HP (1 token)')
      .setStyle('Primary')

    // Button 2: Heal 30 HP for 10 tokens; only show if missing at least 30 HP.
    let healTen
    if (missingHP >= 30) {
      healTen = new ButtonBuilder()
        .setCustomId('heal_10')
        .setLabel('Heal 30 HP (10 tokens)')
        .setStyle('Primary')
    }

    // Button 3: Heal Max – spend as many tokens as needed.
    const healMax = new ButtonBuilder()
      .setCustomId('heal_max')
      .setLabel('Heal to Max')
      .setStyle('Primary')

    // Build footer from user's currency.
    const gold = user.gold || 0
    const currency = user.currency || {}
    const energy = currency.energy || 0
    const tokens = currency.tokens || 0
    const eggs = currency.eggs || 0
    const ichor = currency.ichor || 0
    const footerText = `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor}`

    const templeEmbed = new EmbedBuilder()
      .setTitle('Temple')
      .setDescription(
        `Your HP: ${currentHP}/${maxHP}\nEach token heals 3 HP.\nSelect an option below to heal.`
      )
      .setFooter({ text: footerText })
      .setColor('Green')
      .setThumbnail(interaction.user.displayAvatarURL())

    const row = new ActionRowBuilder().addComponents(healOne)
    if (healTen) row.addComponents(healTen)
    row.addComponents(healMax)

    await interaction.reply({
      embeds: [templeEmbed],
      components: [row],
      ephemeral: true,
    })

    // Create a collector for temple interactions.
    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === userId,
      time: 30000,
    })
    collectors.set(userId, collector)

    collector.on('collect', async (i) => {
      // Refresh player's current HP and user's currency.
      const refreshedPlayer = await getOrCreatePlayer(userId)
      const refreshedUser = await User.findOne({ where: { user_id: userId } })
      const currentHPRef = refreshedPlayer.current_hp
      const maxHPRef = refreshedPlayer.max_hp || 100
      const missingHPRef = maxHPRef - currentHPRef
      const availableTokens =
        (refreshedUser.currency && refreshedUser.currency.tokens) || 0

      let healAmount = 0
      let cost = 0

      if (i.customId === 'heal_1') {
        cost = 1
        healAmount = 3
      } else if (i.customId === 'heal_10') {
        cost = 10
        healAmount = 30
      } else if (i.customId === 'heal_max') {
        cost = Math.ceil(missingHPRef / 3)
        healAmount = cost * 3
      }
      // Cap healing to missingHP.
      if (healAmount > missingHPRef) {
        healAmount = missingHPRef
      }

      console.log(
        `[TEMPLE] User ${userId} selected ${i.customId}: cost=${cost}, healAmount=${healAmount}, missingHP=${missingHPRef}, availableTokens=${availableTokens}`
      )

      if (availableTokens < cost) {
        await i.reply({
          content: `You don't have enough tokens (you need ${cost} tokens).`,
          ephemeral: true,
        })
        return
      }

      // Deduct tokens.
      refreshedUser.currency.tokens -= cost
      await refreshedUser.save()

      // Increase HP, ensuring it doesn't exceed maxHP.
      refreshedPlayer.current_hp += healAmount
      if (refreshedPlayer.current_hp > maxHPRef) {
        refreshedPlayer.current_hp = maxHPRef
      }
      await refreshedPlayer.save()

      // Update footer.
      const newGold = refreshedUser.gold || 0
      const newCurrency = refreshedUser.currency || {}
      const newEnergy = newCurrency.energy || 0
      const newTokens = newCurrency.tokens || 0
      const newEggs = newCurrency.eggs || 0
      const newIchor = newCurrency.ichor || 0
      const newFooterText = `Available: 🪙${newGold} ⚡${newEnergy} 🧿${newTokens} 🥚${newEggs} 🧪${newIchor}`

      const newEmbed = new EmbedBuilder()
        .setTitle('Temple')
        .setDescription(
          `Your HP: ${refreshedPlayer.current_hp}/${maxHPRef}\nHealed for ${healAmount} HP using ${cost} token(s).`
        )
        .setFooter({ text: newFooterText })
        .setColor('Green')
        .setThumbnail(interaction.user.displayAvatarURL())

      await i.update({ embeds: [newEmbed], components: [] })
      collector.stop()
    })

    collector.on('end', async () => {
      collectors.delete(userId)
      try {
        await interaction.editReply({ components: [] })
      } catch (error) {
        console.error('Failed to clear temple components:', error)
      }
    })
  },
}
