const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const { User, Arena } = require('../../Models/model.js')

const TRAINING_TIERS = [
  { level: 'Grasshopper', max: 20, cost: 2500, duration: 2 },
  { level: 'Basic', max: 40, cost: 5000, duration: 3 },
  { level: 'Intermediate', max: 80, cost: 7500, duration: 4 },
  { level: 'Adept', max: 100, cost: 10000, duration: 6 },
  { level: 'Advanced', max: 120, cost: 12500, duration: 8 },
  { level: 'Expert', max: 150, cost: 15000, duration: 12 },
  { level: 'Master', max: 200, cost: 17500, duration: 18 },
  { level: 'Grand Master', max: 250, cost: 20000, duration: 24 },
]

const BOOST_ODDS = [
  { boost: 2, chance: 1 / 10 }, // 10%
  { boost: 3, chance: 1 / 100 }, // 1%
  { boost: 4, chance: 1 / 1000 }, // 0.1%
  { boost: 5, chance: 1 / 10000 }, // 0.01%
  { boost: 6, chance: 1 / 100000 }, // 0.001%
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName('train')
    .setDescription('Train your stats in the Arena')
    .addStringOption((option) =>
      option
        .setName('stat')
        .setDescription('Choose a stat to train')
        .setRequired(true)
        .addChoices(
          { name: 'HP', value: 'max_hp' },
          { name: 'Strength', value: 'strength' },
          { name: 'Defense', value: 'defense' },
          { name: 'Intelligence', value: 'intelligence' },
          { name: 'Agility', value: 'agility' }
        )
    ),

  async execute(interaction) {
    const userId = interaction.user.id
    const stat = interaction.options.getString('stat')

    const user = await User.findOne({ where: { user_id: userId } })
    const arenaAccount = await Arena.findOne({ where: { userId: userId } })

    if (!user || !arenaAccount) {
      return interaction.reply({
        content: 'You need to set up an account first! Use `/account` to begin.',
        ephemeral: true,
      })
    }

    const statValue = arenaAccount[stat] || 0
    const tier = TRAINING_TIERS.find((tier) => statValue <= tier.max)

    if (!tier) {
      return interaction.reply({
        content: 'You have reached the maximum training level!',
        ephemeral: true,
      })
    }

    if (user.gold < tier.cost) {
      return interaction.reply({
        content: `You need \`\`${tier.cost}\`\` gold to start this training.`,
        ephemeral: true,
      })
    }

    // Deduct gold and start training
    user.gold -= tier.cost
    arenaAccount.training = {
      stat,
      start_time: Date.now(),
      duration: tier.duration * 60 * 60 * 1000, // Convert hours to milliseconds
      level: tier.level,
      cost: tier.cost,
    }
    await user.save()
    await arenaAccount.save()

    const trainingEmbed = new EmbedBuilder()
      .setTitle(`🏋️ Training Started: ${tier.level} Training`)
      .setDescription(
        `You are now training **${stat.charAt(0).toUpperCase() + stat.slice(1)}**.\n\n` +
          `- **Current Score:** ${statValue}\n` +
          `- **Cost:** \`\`${tier.cost}\`\` gold\n` +
          `- **Duration:** \`\`${tier.duration} hours\`\`\n\n` +
          `Once the training is complete, press **"Complete Course"** to finalize your stats.`
      )
      .setColor('#FFD700')
      .setFooter({
        text: `Gold Remaining: 🪙${user.gold}`,
      })

    const completeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`complete_training_${userId}`)
        .setLabel('Complete Course')
        .setStyle(ButtonStyle.Success)
    )

    await interaction.reply({
      embeds: [trainingEmbed],
      components: [completeButton],
      ephemeral: true,
    })
  },
}

// 🎯 Complete Training
module.exports.completeTraining = async (interaction) => {
  const userId = interaction.user.id
  const arenaAccount = await Arena.findOne({ where: { userId: userId } })

  if (!arenaAccount || !arenaAccount.training) {
    return interaction.reply({
      content: 'You have no active training!',
      ephemeral: true,
    })
  }

  const { stat, start_time, duration, level } = arenaAccount.training
  const timeElapsed = Date.now() - start_time

  if (timeElapsed < duration) {
    return interaction.reply({
      content: `Your training is not finished yet! Come back in **${Math.ceil((duration - timeElapsed) / 3600000)} hours.**`,
      ephemeral: true,
    })
  }

  // Determine stat boost
  let boost = 1
  for (const { boost: amount, chance } of BOOST_ODDS) {
    if (Math.random() < chance) {
      boost = amount
      break
    }
  }

  // Apply stat increase
  arenaAccount[stat] = (arenaAccount[stat] || 0) + boost
  arenaAccount.training = null
  await arenaAccount.save()

  const completionEmbed = new EmbedBuilder()
    .setTitle('✅ Training Completed!')
    .setDescription(
      `Your **${stat.charAt(0).toUpperCase() + stat.slice(1)}** training at **${level}** level is complete!\n\n` +
        `- **New Score:** ${arenaAccount[stat]} (+${boost})\n` +
        `- **Training Level:** ${level}\n\n` +
        `You can train again by using **/train**.`
    )
    .setColor('#00FF00')

  await interaction.reply({ embeds: [completionEmbed], ephemeral: true })
}
