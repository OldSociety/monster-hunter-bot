const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { User } = require('../../Models/model.js');
const {
    cacheHuntMonsters,
    pullMonsterByCR,
} = require('../../handlers/huntCacheHandler');
const { calculateReward, addGoldToUser } = require('../../handlers/rewardHandler');

const difficultyOptions = {
    easy: 0.75, // Adjust monster score for easy mode
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hunt')
        .setDescription('Embark on a hunt and engage in combat with a series of monsters'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const userId = interaction.user.id;
        const user = await User.findOne({ where: { user_id: userId } });
        if (!user) {
            await interaction.editReply({
                content: "You don't have an account. Use `/account` to create one.",
                ephemeral: true,
            });
            return;
        }

        const loadingEmbed = new EmbedBuilder()
            .setColor(0xffcc00)
            .setDescription('Loading hunt data, please wait...');
        await interaction.editReply({ embeds: [loadingEmbed] });

        await cacheHuntMonsters();

        const startHuntEmbed = new EmbedBuilder()
            .setTitle('Prepare for the Hunt')
            .setDescription(
                'You are about to embark on a monster hunt. Do you want to continue?'
            )
            .setColor('#FF0000');

        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_hunt')
            .setLabel('Continue')
            .setStyle(ButtonStyle.Success);
        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_hunt')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger);
        const startRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.editReply({
            embeds: [startHuntEmbed],
            components: [startRow],
            ephemeral: true
        });

        const filter = (i) => i.user.id === userId;
        const collector = interaction.channel.createMessageComponentCollector({
            filter,
            time: 15000,
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'cancel_hunt') {
                await i.update({
                    content: 'Hunt cancelled.',
                    embeds: [],
                    components: [],
                    ephemeral: true,
                });
                collector.stop();
                return;
            }
            if (i.customId === 'confirm_hunt') {
                await i.deferUpdate();
                collector.stop();
                await startNewEncounter(interaction, user, 1, 'easy'); 
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    content: 'Session expired. Please start again.',
                    components: [],
                    ephemeral: true
                });
            }
        });
    },
};

async function startNewEncounter(interaction, user, currentCR, difficulty = 'easy') {
    let adjustedCR = currentCR;
    if (currentCR === 1) {
        adjustedCR = 0.25; 
    } else if (currentCR === 2) {
        adjustedCR = 0.5; 
    } else {
        adjustedCR = currentCR - 1; 
    }

    let monster;
    do {
        monster = pullMonsterByCR(adjustedCR);
    } while (!monster || !monster.index);

    const imageUrl = `https://raw.githubusercontent.com/theoperatore/dnd-monster-api/master/src/db/assets/${monster.index}.jpg`;

    let monsterScore = monster.cr * (monster.hp / 10) + 25;
    if (difficulty === 'easy') {
        monsterScore *= difficultyOptions[difficulty];
    }

    const monsterEmbed = new EmbedBuilder()
        .setTitle(`A wild ${monster.name} appears!`)
        .setDescription(`**CR:** ${adjustedCR}\n**Type:** ${monster.type}`)
        .setColor('#FFA500')
        .setThumbnail(imageUrl);

    const styleRow = new ActionRowBuilder();
    if (user.brute_score > 0) {
        styleRow.addComponents(
            new ButtonBuilder()
                .setCustomId('style_brute')
                .setLabel(`Brute: ${user.brute_score}`)
                .setStyle(ButtonStyle.Primary)
        );
    }
    if (user.caster_score > 0) {
        styleRow.addComponents(
            new ButtonBuilder()
                .setCustomId('style_caster')
                .setLabel(`Caster: ${user.caster_score}`)
                .setStyle(ButtonStyle.Secondary)
        );
    }
    if (user.sneak_score > 0) {
        styleRow.addComponents(
            new ButtonBuilder()
                .setCustomId('style_sneak')
                .setLabel(`Sneak: ${user.sneak_score}`)
                .setStyle(ButtonStyle.Success)
        );
    }

    await interaction.followUp({
        embeds: [monsterEmbed],
        components: [styleRow],
        ephemeral: true
    });

    const filter = (i) => i.user.id === interaction.user.id;
    const styleCollector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 15000,
    });

    styleCollector.on('collect', async (styleInteraction) => {
        await styleInteraction.deferUpdate();
        const selectedStyle = styleInteraction.customId.split('_')[1];

        const playerScore = user[`${selectedStyle}_score`];
        const winChance = calculateWinChance(playerScore, monsterScore);
        const playerWins = await runBattlePhases(
            interaction,
            playerScore,
            monsterScore,
            winChance.adjusted,
            monster
        );

        if (playerWins) {
            const goldReward = calculateReward(adjustedCR);
            await addGoldToUser(user, goldReward);

            const continueEmbed = new EmbedBuilder()
                .setTitle('Battle Complete')
                .setDescription(`You defeated the ${monster.name} and earned ${goldReward} gold. Continue or collect rewards?`)
                .setColor('#00FF00');

            const continueButton = new ButtonBuilder()
                .setCustomId('continue_hunt')
                .setLabel('Continue Hunt')
                .setStyle(ButtonStyle.Success);
            const endHuntButton = new ButtonBuilder()
                .setCustomId('end_hunt')
                .setLabel('End Hunt and Collect Rewards')
                .setStyle(ButtonStyle.Danger);
            const continueRow = new ActionRowBuilder().addComponents(
                continueButton,
                endHuntButton
            );

            await interaction.followUp({
                embeds: [continueEmbed],
                components: [continueRow],
                ephemeral: true
            });

            const continueCollector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 15000,
            });

            continueCollector.on('collect', async (continueInteraction) => {
                await continueInteraction.deferUpdate();
                if (continueInteraction.customId === 'continue_hunt') {
                    continueCollector.stop();
                    await startNewEncounter(interaction, user, currentCR + 1, difficulty);
                } else if (continueInteraction.customId === 'end_hunt') {
                    continueCollector.stop();
                    await displayHuntSummary(interaction, user); 
                }
            });
        } else {
            await displayHuntSummary(interaction, user); 
        }
    });
}

async function displayHuntSummary(interaction, user) {
    const summaryEmbed = new EmbedBuilder()
        .setTitle('Hunt Summary')
        .setDescription(`**Total Monsters Defeated:** X\n**Total Gold Earned:** Y`)
        .setColor('#FFD700');
    
    await interaction.followUp({ embeds: [summaryEmbed], ephemeral: false });
}





async function runBattlePhases(
  interaction,
  playerScore,
  monsterScore,
  winChance,
  monster
) {
  let playerWins = 0
  let monsterWins = 0

  const imageUrl = `https://raw.githubusercontent.com/theoperatore/dnd-monster-api/master/src/db/assets/${monster.index}.jpg`

  for (let phase = 1; phase <= 5; phase++) {
    const playerRoll = Math.random() * playerScore
    const monsterRoll = Math.random() * monsterScore
    const phaseResult = playerRoll > monsterRoll ? 'Hit!' : 'Miss!'

    const phaseEmbed = new EmbedBuilder()
      .setTitle(`Phase ${phase} - Battle with ${monster.name}`)
      .setDescription(
        `**CR:** ${monster.cr}\n` +
          `**Player Score:** ${playerScore}\n` +
          `**Enemy Score:** ${monsterScore}\n` +
          `**Chance of Winning:** ${winChance}%\n` +
          `**Phase ${phase}**\n${phaseResult} Player rolled ${playerRoll.toFixed(
            2
          )}, Monster rolled ${monsterRoll.toFixed(2)}`
      )
      .setColor('#FF4500')
      .setThumbnail(imageUrl)

    await interaction.followUp({ embeds: [phaseEmbed], ephemeral: true })
    await new Promise((resolve) => setTimeout(resolve, 2000))

    phaseResult.includes('Hit!') ? playerWins++ : monsterWins++
    if (playerWins === 3 || monsterWins === 3) break
  }
  return playerWins >= 3
}

// Utility Functions

function checkAdvantage(playerStyle, monsterType) {
  const advantageMap = { brute: 'sneak', sneak: 'caster', caster: 'brute' }
  return advantageMap[playerStyle] === monsterType
}

function calculateWinChance(playerScore, monsterScore, isAdvantaged) {
  const baseWinChance = Math.round(
    (playerScore / (playerScore + monsterScore)) * 100
  )
  const adjustedWinChance = isAdvantaged
    ? Math.min(baseWinChance + 25, 100)
    : baseWinChance
  return { base: baseWinChance, adjusted: adjustedWinChance }
}

function getEmbedColor(style) {
  const colorMap = { brute: '#FF0000', caster: '#0000FF', sneak: '#800080' }
  return colorMap[style]
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
