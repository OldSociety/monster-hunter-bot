// battleHandler.js

const { EmbedBuilder } = require('discord.js')

function createHealthBar(currentHealth, maxHealth) {
  const totalSegments = 15
  let filledSegments = Math.max(0, Math.round((currentHealth / maxHealth) * totalSegments)) // Ensure ≥ 0
  if (currentHealth > 0 && filledSegments < 1) filledSegments = 1
  let unfilledSegments = Math.max(0, totalSegments - filledSegments) // Ensure ≥ 0
  return (
    '``' +
    '『' +
    '🟥'.repeat(filledSegments) +
    '⬛'.repeat(unfilledSegments) +
    '』' +
    '``'
  )
}

async function runBattlePhases(
  interaction,
  user,
  playerScore,
  monsterScore,
  monster,
  advMultiplier,
  huntData,
  battleType,
  customImageUrl = null // New optional parameter.
) {
  if (!playerScore || !monsterScore) {
    console.error('Invalid player or monster score provided.');
    return false;
  }

  let playerWins = 0;
  let monsterWins = 0;
  let momentum = 15;
  const maxMomentum = 15;
  // Use the passed customImageUrl if available; otherwise, compute the default.
  const imageUrl =
    customImageUrl ||
    `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${monster.index}.jpg`;

  console.log(`Starting battle against: ${monster.name} (CR: ${monster.cr})`);

  for (let phase = 1; phase <= 7; phase++) {
    console.log(`--- Phase ${phase} ---`);
    const isDisadvantaged = advMultiplier < 1;
    const isAdvantaged = advMultiplier > 1;
    const effectivePlayerScore = (playerScore + user.base_damage) * advMultiplier;

    const minimumRoll = huntData.ichorUsed
      ? playerScore * 0.3
      : playerScore * 0.15;

    let playerRoll = Math.round(
      Math.max(
        Math.random() * (effectivePlayerScore - minimumRoll) + minimumRoll,
        minimumRoll
      )
    );

    let monsterMinRoll =
      battleType === 'boss'
        ? monsterScore * 0.5
        : battleType === 'mini-boss'
        ? monsterScore * 0.25
        : 0;

    let monsterRoll = Math.round(
      Math.max(Math.random() * monsterScore, monsterMinRoll)
    );
    const phaseResult = playerRoll >= monsterRoll ? 'Hit!' : 'Miss!';

    if (phaseResult === 'Hit!') {
      playerWins++;
      const flatDamage = 4;
      momentum -= Math.min(flatDamage, momentum);
      if (playerWins >= 4) {
        user.currency.gems = (user.currency.gems || 0) + 1;
        user.changed('currency', true);
        await user.save();
        return true;
      }
    } else {
      monsterWins++;
    }

    const healthBar = createHealthBar(momentum, maxMomentum);
    const effects = [
      isAdvantaged ? '⏫Advantage' : '',
      isDisadvantaged ? '⏬Disadvantage' : '',
      huntData.ichorUsed ? '🧪Invigorated' : '',
    ]
      .filter(Boolean)
      .join(', ') || 'None';

    const phaseEmbed = new EmbedBuilder()
      .setTitle(`Phase ${phase} - Battle with ${monster.name}`)
      .setDescription(
        `**CR:** ${monster.cr}\n` +
          `**Player Score:** ${Math.floor(effectivePlayerScore)}\n` +
          `**Enemy Score:** ${Math.floor(monsterScore)}\n\n` +
          `**Effects:** ${effects}\n\n` +
          `**Phase ${phase}**\n${phaseResult} Player rolled ${playerRoll}, Monster rolled ${monsterRoll}\n\n` +
          `${healthBar}`
      )
      .setColor('#FF4500')
      .setImage(imageUrl);

    try {
      if (!interaction.replied) {
        await interaction.followUp({ embeds: [phaseEmbed], ephemeral: true });
      } else {
        await interaction.followUp({ embeds: [phaseEmbed], ephemeral: true });
      }
    } catch (error) {
      console.warn(`⚠️ Failed to update interaction: ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (playerWins === 4 || momentum <= 0) break;
    if (monsterWins === 4) return false;
  }

  return playerWins >= 4;
}


module.exports = {
  createHealthBar,
  runBattlePhases,
}
