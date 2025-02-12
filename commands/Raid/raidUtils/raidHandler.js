const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { checkAdvantage } = require('../../Hunt/huntUtils/huntHelpers.js');
const { createHealthBar } = require('../../Hunt/huntUtils/battleHandler.js');
const { displayHuntSummary } = require('../../Hunt/huntUtils/rewardHandler.js');
const { collectors, stopUserCollector } = require('../../../utils/collectors');
const cron = require('node-cron');
const { RaidBoss } = require('../../../Models/model.js');

// Helper to format milliseconds to days, hours, minutes, seconds.
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function getUserFooter(user) {
  const gold = user.gold || 0;
  const currency = user.currency || {};
  const energy = currency.energy || 0;
  const tokens = currency.tokens || 0;
  const eggs = currency.eggs || 0;
  const ichor = currency.ichor || 0;
  return `Available: 🪙${gold} ⚡${energy} 🧿${tokens} 🥚${eggs} 🧪${ichor}`;
}

function createRaidBossEmbed(raidBoss, user) {
  const playerHealthBar = createHealthBar(user.current_raidHp, user.score);
  const bossHealthBar = createHealthBar(raidBoss.hp, raidBoss.maxHP);
  console.log(raidBoss.combatType);
  return new EmbedBuilder()
    .setTitle(`RAID BOSS - ${raidBoss.name}`)
    .setDescription(
      `**Your HP:** ${user.current_raidHp} / ${user.score}  ${playerHealthBar}\n\n` +
      `**Combat Type:** ${raidBoss.combatType}\n\n` +
      `**Boss HP:** ${raidBoss.hp} / ${raidBoss.maxHP}  ${bossHealthBar}\n\n` +
      `**Possible Loot Drops:**\n${raidBoss.lootDrops.join('\n')}`
    )
    .setColor('#FF4500')
    .setThumbnail(
      `https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${raidBoss.combatType}C.png`
    )
    .setImage(raidBoss.imageUrl)
    .setFooter({ text: getUserFooter(user) });
}

async function runBattlePhases(
  interaction,
  user,
  playerScore,
  raidBoss,
  advMultiplier,
  huntData
) {
  if (!user.current_raidHp) {
    user.current_raidHp = user.score;
    await user.save();
  }

  let playerHP = user.current_raidHp;
  let bossHP = raidBoss.hp;
  const maxBossHP = raidBoss.maxHP;
  const maxPlayerHP = user.score;
  const imageUrl = raidBoss.imageUrl;

  for (let phase = 1; bossHP > 0 && playerHP > 0; phase++) {
    let playerRoll = Math.round(Math.random() * playerScore * advMultiplier);
    let monsterRoll = Math.round(Math.random() * raidBoss.rollScore); // Using monster.hp as roll power

    let phaseResult = playerRoll >= monsterRoll ? 'Hit!' : 'Miss!';

    if (phaseResult === 'Hit!') {
      // During active phase, players do 10% damage instead of full.
      if (raidBossRotation.phase === 'active') {
        bossHP -= Math.round(playerRoll * 0.1);
      } else {
        bossHP -= playerRoll;
      }
    } else {
      playerHP -= monsterRoll; // Player takes damage from boss
    }

    if (bossHP <= 0) bossHP = 0;
    if (playerHP <= 0) playerHP = 0;

    user.current_raidHp = playerHP;
    await user.save(); // 🛑 Ensure HP is saved after each phase

    const playerHealthBar = createHealthBar(playerHP, maxPlayerHP);
    const bossHealthBar = createHealthBar(bossHP, maxBossHP);

    const phaseEmbed = new EmbedBuilder()
      .setTitle(`Phase ${phase} - Fighting ${raidBoss.name}`)
      .setDescription(
        `**Your HP:** ${playerHP} / ${maxPlayerHP}  ${playerHealthBar}\n` +
        `**Boss HP:** ${bossHP} / ${maxBossHP}  ${bossHealthBar}\n\n` +
        `**Player Roll:** ${playerRoll}\n` +
        `**Boss Roll:** ${monsterRoll}\n\n` +
        `**Phase ${phase} Result:** ${phaseResult}\n`
      )
      .setColor('#FF4500')
      .setImage(imageUrl)
      .setFooter({ text: getUserFooter(user) });

    await interaction.followUp({ embeds: [phaseEmbed], ephemeral: true });

    if (bossHP <= 0) return true; // Boss is defeated
    if (playerHP <= 0) return false; // Player is defeated

    await new Promise((resolve) => setTimeout(resolve, 3000)); // 🛑 Delay for 3 seconds between phases
  }

  return false;
}

async function startRaidEncounter(interaction, user) {
  stopUserCollector(interaction.user.id);

  // Use RaidBoss model and select the current boss from our rotation.
  const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] });
  if (!raidBosses || raidBosses.length === 0) {
    return interaction.followUp({
      content: 'Error: No valid raid bosses found.',
      ephemeral: true,
    });
  }

  // Select the current raid boss from the rotation.
  const selectedBoss = raidBosses[raidBossRotation.currentIndex];
  const bossStartingHP = Math.max(1, selectedBoss.cr * 1000);

  if (!user.current_raidHp) {
    user.current_raidHp = user.score;
    await user.save();
  }

  const raidBoss = {
    name: selectedBoss.name,
    index: selectedBoss.index,
    type: selectedBoss.type,
    combatType: selectedBoss.combatType,
    hp: bossStartingHP,
    maxHP: bossStartingHP,
    rollScore: selectedBoss.hp,
    imageUrl: selectedBoss.imageUrl,
    lootDrops: selectedBoss.lootDrops || [],
    activePhase: raidBossRotation.phase === 'active'
  };

  const huntData = {
    totalGoldEarned: 0,
    ichorUsed: false,
    level: raidBoss,
    lastMonster: raidBoss,
    inProgress: true,
  };

  const monsterEmbed = createRaidBossEmbed(raidBoss, user);
  const styleRow = createStyleButtons(user);
  const healRow = createHealButtons(user);

  await interaction.followUp({
    embeds: [monsterEmbed],
    components: [styleRow, healRow],
    ephemeral: true,
  });

  const filter = (i) => i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 60000,
  });
  collectors.set(interaction.user.id, collector);

  collector.on('collect', async (i) => {
    if (i.customId === 'heal') {
      await handleHealAction(i, user, raidBoss, 'one');
      return;
    }

    if (i.customId === 'heal_max') {
      await handleHealAction(i, user, raidBoss, 'max');
      return;
    }

    if (i.customId === 'cancel_raid') {
      await handleCancelRaid(i, user);
      return;
    }

    if (huntData.styleInteractionHandled) return;
    huntData.styleInteractionHandled = true;

    const selectedStyle = i.customId.split('_')[1];
    const playerScore = user[`${selectedStyle}_score`];
    const advMultiplier = checkAdvantage(selectedStyle, raidBoss.combatType);

    await i.deferUpdate();
    const playerWins = await runBattlePhases(
      i,
      user,
      playerScore,
      raidBoss,
      advMultiplier,
      huntData
    );

    if (playerWins) {
      huntData.totalGoldEarned += 0;
      await displayHuntSummary(i, user, huntData, true);
    } else {
      await displayHuntSummary(i, user, huntData, false);
    }

    huntData.styleInteractionHandled = false;
  });
}

function createHealButtons(user) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('heal')
      .setLabel(`Heal (10 HP per token)`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(user.currency.tokens < 1),
    new ButtonBuilder()
      .setCustomId('heal_max')
      .setLabel(`Heal to Max`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(user.currency.tokens < 1),
    new ButtonBuilder()
      .setCustomId('cancel_raid')
      .setLabel(`Cancel Raid`)
      .setStyle(ButtonStyle.Secondary)
  );
}

async function handleCancelRaid(interaction, user) {
  await interaction.deferUpdate(); // Defer the interaction before updating

  // Reset the user's raid HP
  user.current_raidHp = user.score;
  await user.save();

  await interaction.message.edit({
    content: 'You have canceled the raid.',
    embeds: [],
    components: [],
  });
}

async function handleHealAction(interaction, user, raidBoss, healType) {
  await interaction.deferUpdate(); // Defer the interaction before updating

  if (user.currency.tokens < 1) {
    return interaction.followUp({
      content: "You don't have enough tokens to heal.",
      ephemeral: true,
    });
  }

  let tokensSpent = 0;
  if (healType === 'max') {
    // Heal to full, spending as many tokens as needed
    const neededHealing = user.score - user.current_raidHp;
    tokensSpent = Math.min(Math.ceil(neededHealing / 10), user.currency.tokens);
    user.current_raidHp = user.score;
  } else {
    // Heal 10 HP per token
    user.current_raidHp = Math.min(user.current_raidHp + 10, user.score);
    tokensSpent = 1;
  }

  user.currency.tokens -= tokensSpent;
  await user.save(); // 🛑 Ensure tokens are removed and saved properly

  // Create updated embed with new player health
  const updatedEmbed = createRaidBossEmbed(raidBoss, user);

  try {
    if (interaction.message) {
      await interaction.message.edit({ embeds: [updatedEmbed] });
    } else {
      await interaction.followUp({ embeds: [updatedEmbed], ephemeral: true });
    }
  } catch (error) {
    console.error('❌ Failed to edit message, sending a new one instead.', error);
    await interaction.followUp({ embeds: [updatedEmbed], ephemeral: true });
  }
}

function createStyleButtons(user) {
  const styles = ['brute', 'spellsword', 'stealth'];
  const styleColors = {
    brute: ButtonStyle.Danger,
    spellsword: ButtonStyle.Primary,
    stealth: ButtonStyle.Success,
  };

  const styleRow = new ActionRowBuilder();
  styles.forEach((style) => {
    if (user[`${style}_score`] > 0) {
      styleRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`style_${style}`)
          .setLabel(
            `${style.charAt(0).toUpperCase() + style.slice(1)}: ${user[`${style}_score`]}`
          )
          .setStyle(styleColors[style])
      );
    }
  });
  return styleRow;
}

// Global rotation state for RaidBosses.
let raidBossRotation = {
  currentIndex: 0,
  phase: 'active', // 'active' means players do 10% damage; 'cooldown' means no raid encounter.
  lastSwitch: Date.now()
};

// Cron job to rotate the current RaidBoss.
// For testing, each minute simulates a cycle: active phase = 1 minute, cooldown = 1 minute.
cron.schedule('* * * * *', async () => {
  const now = Date.now();
  if (raidBossRotation.phase === 'active') {
    if (now - raidBossRotation.lastSwitch >= 60000) { // 1 minute for active phase
      console.log('Active phase expired. Entering cooldown phase.');
      // Reset current boss health to max.
      try {
        const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] });
        if (raidBosses.length > 0) {
          const currentBoss = raidBosses[raidBossRotation.currentIndex];
          currentBoss.current_hp = currentBoss.hp;
          await currentBoss.save();
        }
      } catch (error) {
        console.error('Error resetting raid boss health on cooldown:', error);
      }
      raidBossRotation.phase = 'cooldown';
      raidBossRotation.lastSwitch = now;
      
      // Send cooldown embed.
      const cooldownDuration = 60000; // 1 minute test duration; in production, use 2 days.
      const cooldownEmbed = new EmbedBuilder()
        .setTitle("Raids are in cooldown")
        .setDescription(`Raids will begin again in ${formatTime(cooldownDuration)}.`)
        .setColor("Gold");
      
    }
  } else if (raidBossRotation.phase === 'cooldown') {
    if (now - raidBossRotation.lastSwitch >= 60000) { // 1 minute for cooldown phase
      console.log('Cooldown phase expired. Rotating to next RaidBoss.');
      try {
        const raidBosses = await RaidBoss.findAll({ order: [['id', 'ASC']] });
        if (raidBosses.length > 0) {
          raidBossRotation.currentIndex = (raidBossRotation.currentIndex + 1) % raidBosses.length;
          const newBoss = raidBosses[raidBossRotation.currentIndex];
          newBoss.current_hp = newBoss.hp; // Reset health for the new boss.
          await newBoss.save();
          console.log(`Switched to new RaidBoss: ${newBoss.name}`);
        } else {
          console.log('No RaidBosses found in the database.');
        }
      } catch (error) {
        console.error('Error rotating RaidBoss:', error);
      }
      raidBossRotation.phase = 'active';
      raidBossRotation.lastSwitch = now;
    }
  }
});

module.exports = { startRaidEncounter };
