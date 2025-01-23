// encounterHandler.js

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js')
const {
  pullSpecificMonster,
  pullMonsterByCR,
} = require('../../../handlers/huntCacheHandler')
const { checkAdvantage } = require('./huntHelpers.js')
const { runBattlePhases } = require('./battleHandler.js')
const { addGoldToUser, displayHuntSummary } = require('./rewardHandler.js')

function selectMonster(huntData, currentBattle) {
  console.log(
    `Selecting monster for battle index: ${huntData.currentBattleIndex}, retries: ${huntData.retries}`
  )

  if (huntData.lastMonster && huntData.retries > 0) {
    console.log('Reusing last monster due to retries.')
    return huntData.lastMonster
  }

  const selectedMonster =
    currentBattle.type === 'mini-boss' || currentBattle.type === 'boss'
      ? pullSpecificMonster(currentBattle.monsterIndex)
      : pullMonsterByCR(currentBattle.cr)

  console.log(
    `Monster selected: ${selectedMonster ? selectedMonster.name : 'None found'}`
  )
  return selectedMonster
}

function calculateMonsterHP(monster, difficulty) {
  console.log(
    `Calculating HP for monster: ${monster.name}, difficulty: ${difficulty}`
  )

  const difficultyModifiers = {
    easy: 0.5,
    medium: 0.75,
    hard: 1.25,
    'very-hard': 1.5,
    'boss-half': 0.5,
    'boss-full': 1,
    'boss-strong': 1.25,
  }
  const finalHP = Math.max(
    monster.hp * (difficultyModifiers[difficulty] || 1),
    8
  )

  console.log(`Final monster HP: ${finalHP}`)
  return finalHP
}

function createMonsterEmbed(monster, difficulty, ichorUsed) {
  console.log(
    `Creating embed for monster: ${monster.name}, difficulty: ${difficulty}, ichorUsed: ${ichorUsed}`
  )

  let title = monster.name
  if (difficulty === 'boss') title += ' ``Boss!``'
  if (difficulty === 'mini-boss') title += ' ``Mini-boss``'

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`**CR:** ${monster.cr}\n**Type:** ${monster.type}`)
    .setColor('#FFA500')
    .setThumbnail(
      `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${monster.index}.jpg`
    )

  if (ichorUsed) {
    embed.addFields({
      name: 'Ichor Invigoration',
      value: 'You are invigorated with 🧪ichor! Your strength increases.',
    })
  }

  console.log('Monster embed created.')
  return embed
}

function createStyleButtons(user) {
  console.log(`Creating style buttons for user: ${user.id}`)

  const styles = ['brute', 'spellsword', 'stealth']
  const styleColors = {
    brute: ButtonStyle.Danger,
    spellsword: ButtonStyle.Primary,
    stealth: ButtonStyle.Success,
  }

  const styleRow = new ActionRowBuilder()
  styles.forEach((style) => {
    if (user[`${style}_score`] > 0) {
      console.log(`Adding button for style: ${style}`)
      styleRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`style_${style}`)
          .setLabel(
            `${style.charAt(0).toUpperCase() + style.slice(1)}: ${
              user[`${style}_score`]
            }`
          )
          .setStyle(styleColors[style])
      )
    }
  })

  return styleRow
}

async function startNewEncounter(interaction, user, huntData) {
  console.log(`startNewEncounter() called for: ${interaction.user.tag}`)

  const currentBattle = huntData.level.battles[huntData.currentBattleIndex]
  console.log(`Current battle: ${currentBattle ? currentBattle.type : 'None'}`)

  const monster = selectMonster(huntData, currentBattle)

  if (!monster) {
    console.error('No monsters available for this encounter.')
    return interaction.followUp({
      content: 'No monsters available.',
      ephemeral: true,
    })
  }

  huntData.lastMonster = monster
  const monsterScore = calculateMonsterHP(monster, currentBattle.difficulty)
  const monsterEmbed = createMonsterEmbed(
    monster,
    currentBattle.type,
    huntData.ichorUsed
  )
  const styleRow = createStyleButtons(user)

  console.log(`Sending monster embed and buttons to ${interaction.user.tag}...`)
  await interaction.followUp({
    embeds: [monsterEmbed],
    components: [styleRow],
    ephemeral: true,
  })

  if (huntData.styleCollector) {
    console.log('Stopping previous style collector.')
    huntData.styleCollector.stop()
  }

  const filter = (i) => i.user.id === interaction.user.id
  console.log('Setting up interaction collector for battle style selection...')
  const styleCollector = interaction.channel.createMessageComponentCollector({
    filter,
    max: 1,
    time: 15000,
  })

  huntData.styleCollector = styleCollector

  styleCollector.on('collect', async (styleInteraction) => {
    console.log(`Collector received interaction: ${styleInteraction.customId}`);

    // Prevent duplicate interactions
    if (huntData.styleInteractionHandled) {
        console.warn('⚠️ Duplicate interaction detected. Ignoring.');
        return;
    }
    huntData.styleInteractionHandled = true; // Mark as handled

    try {
        // Acknowledge immediately to prevent expiration
        if (styleInteraction.replied || styleInteraction.deferred) {
            console.warn(`⚠️ Interaction ${styleInteraction.id} was already acknowledged.`);
        } else {
            await styleInteraction.deferUpdate().catch(err => console.warn('⚠️ deferUpdate failed:', err));
        }

        console.log(`Style selected: ${styleInteraction.customId}`);

        const selectedStyle = styleInteraction.customId.split('_')[1];
        console.log(`Selected battle style: ${selectedStyle}`);

        const playerScore = user[`${selectedStyle}_score`];
        const advMultiplier = checkAdvantage(selectedStyle, monster.type);
        console.log(`Advantage multiplier: ${advMultiplier}`);

        console.log('Running battle phases...');
        const playerWins = await runBattlePhases(
            styleInteraction, user, playerScore, monsterScore, monster, advMultiplier, huntData, currentBattle.type
        );

        if (playerWins) {
            console.log('✅ Player won the battle.');
            huntData.totalMonstersDefeated += 1;
            huntData.totalGoldEarned += currentBattle.goldReward || 0;
            huntData.currentBattleIndex += 1;
            huntData.retries = 0;
            huntData.lastMonster = null;

            if (huntData.currentBattleIndex >= huntData.level.battles.length) {
                console.log('🏆 Final battle completed! Displaying summary.');
                await displayHuntSummary(styleInteraction, user, huntData, true);
            } else {
                console.log('Moving to next battle...');
                huntData.styleInteractionHandled = false; // Reset flag for next battle
                await startNewEncounter(styleInteraction, user, huntData);
            }
        } else {
            console.log('❌ Player lost the battle.');
            huntData.retries += 1;
            if (huntData.retries < 3) {
                console.log(`Retrying battle (Attempt ${huntData.retries}/3)...`);
                huntData.styleInteractionHandled = false; // Reset flag for retry
                await offerRetry(styleInteraction, user, huntData);
            } else {
                console.log('💀 Player failed too many times. Ending hunt.');
                await displayHuntSummary(styleInteraction, user, huntData, false);
            }
        }
    } catch (error) {
        if (error.code === 10062) {
            console.error('⚠️ DiscordAPIError[10062]: Interaction expired before handling.');
        } else {
            console.error('Error processing interaction:', error);
        }
    }
});



styleCollector.on('end', async (_, reason) => {
    console.log(`Style collector ended. Reason: ${reason}`);

    if (reason === 'time') {
        console.warn('⏳ Style selection timed out.');
        try {
            await interaction.followUp({ content: 'Time expired. Please try again.', ephemeral: true });
        } catch (error) {
            console.error('⚠️ Error sending timeout message:', error);
        }
    }
});

}

module.exports = {
  startNewEncounter,
}
