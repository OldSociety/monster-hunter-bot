// worldboss.js
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder,
    SlashCommandBuilder
  } = require('discord.js');
  const { User } = require('../../Models/model.js'); // Your User model
  
  // Global WorldBoss state (update via your scheduler as required)
  let worldBossState = {
    monster: "Epoch Colossus", // The boss's name
    currentHP: 1000,           // Scaled hit points (e.g. API HP * 10)
    maxHP: 1000,
    m_score: 50,               // Boss damage per counterattack
    // Event ends 1 week from now (in ms)
    eventEnd: Date.now() + 7 * 24 * 3600 * 1000,
  };
  
  // --- Derived Stats Helper ---
  // Derived attributes are computed as follows:
  //   strength = allocatedStrength + (4 + 0.1 * brute_score)
  //   defense = allocatedDefense + (4 + 0.1 * stealth_score)
  //   intelligence = allocatedIntelligence + (4 + 0.1 * spellsword_score)
  //   agility = allocatedAgility + (4 + 0.1 * stealth_score)
  // (If allocated values are missing, default to zero.)
  function calculateDerivedStats(user) {
    const allocatedStrength = user.allocatedStrength || 0;
    const allocatedDefense = user.allocatedDefense || 0;
    const allocatedIntelligence = user.allocatedIntelligence || 0;
    const allocatedAgility = user.allocatedAgility || 0;
    
    const strength = allocatedStrength + (4 + 0.1 * user.brute_score);
    const defense = allocatedDefense + (4 + 0.1 * user.stealth_score);
    const intelligence = allocatedIntelligence + (4 + 0.1 * user.spellsword_score);
    const agility = allocatedAgility + (4 + 0.1 * user.stealth_score);
    
    return {
      strength: Math.ceil(strength),
      defense: Math.ceil(defense),
      intelligence: Math.ceil(intelligence),
      agility: Math.ceil(agility)
    };
  }
  
  // --- Format Time Remaining ---
  // Converts milliseconds into a "Xd Yh Zm" string.
  function formatTimeRemaining(ms) {
    let seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }
  
  // --- Health Bar Utility ---
  // Returns a string with "filled" and "empty" segments.
  function createDynamicHealthBar(currentHealth, maxHealth) {
    const totalSegments = 15;
    let filledSegments = Math.round((currentHealth / maxHealth) * totalSegments);
    if (currentHealth > 0 && filledSegments < 1) filledSegments = 1;
    const unfilledSegments = totalSegments - filledSegments;
    return `\`\`\`『${'🟥'.repeat(filledSegments)}${'⬛'.repeat(unfilledSegments)}』\`\`\``;
  }
  
  // --- Embed Generator ---
  // Displays derived stats at the top, a battle recap in the middle,
  // and HP bars at the bottom, plus time remaining and boss damage.
  function generateWorldBossBattleEmbed(user, playerHP, bossState, battleHistory, avatarURL) {
    const derived = calculateDerivedStats(user);
    
    const statsText =
      `**Your Derived Stats:**\n` +
      `Strength: ${derived.strength}\n` +
      `Defense: ${derived.defense}\n` +
      `Intelligence: ${derived.intelligence}\n` +
      `Agility: ${derived.agility}\n`;
    
    const historyText = battleHistory.length > 0
      ? `**Battle Recap:**\n${battleHistory.slice(-5).join('\n')}\n\n`
      : `**Battle Recap:**\nNo actions yet.\n\n`;
    
    const playerHPText =
      `**Your HP:** ${playerHP}/${user.score}\n` +
      `${createDynamicHealthBar(playerHP, user.score)}\n`;
    
    const bossHPText =
      `**Boss HP:** ${bossState.currentHP}/${bossState.maxHP}\n` +
      `${createDynamicHealthBar(bossState.currentHP, bossState.maxHP)}\n`;
    
    const timeRemaining = formatTimeRemaining(bossState.eventEnd - Date.now());
    
    return new EmbedBuilder()
      .setTitle(`WorldBoss Battle: ${bossState.monster}`)
      .setDescription(
        `${statsText}\n` +
        `${historyText}` +
        `${playerHPText}\n` +
        `${bossHPText}\n` +
        `**Time Remaining:** ${timeRemaining}\n` +
        `**Boss Damage:** ${bossState.m_score}`
      )
      .setColor('DarkRed')
      .setThumbnail(avatarURL);
  }
  
  module.exports = {
    data: new SlashCommandBuilder()
      .setName('worldboss')
      .setDescription(`Risk your soul at Zalathor's Table.`),
      
    async execute(interaction) {
      const userId = interaction.user.id;
      
      // Retrieve the user's record.
      const user = await User.findOne({ where: { user_id: userId } });
      if (!user) {
        await interaction.reply({
          content: 'You need to create an account first! Use /account to get started.',
          ephemeral: true,
        });
        return;
      }
      
      // Use the user's score as both the maximum and starting HP.
      let playerHP = user.score;
      
      // Check that an active WorldBoss event exists.
      if (!worldBossState.monster || Date.now() >= worldBossState.eventEnd) {
        await interaction.reply({
          content: 'There is currently no active WorldBoss event. Please try again later.',
          ephemeral: true,
        });
        return;
      }
      
      // Set up a battle history array.
      let battleHistory = [];
      battleHistory.push('Battle begins! You ready your weapon...');
      
      // Create the initial battle embed.
      let battleEmbed = generateWorldBossBattleEmbed(
        user,
        playerHP,
        worldBossState,
        battleHistory,
        interaction.user.displayAvatarURL()
      );
      
      // Build the "Attack" button.
      const attackButton = new ButtonBuilder()
        .setCustomId('worldboss_attack')
        .setLabel('Attack')
        .setStyle('Primary');
      
      const actionRow = new ActionRowBuilder().addComponents(attackButton);
      
      // Reply with the initial embed and button.
      await interaction.reply({
        embeds: [battleEmbed],
        components: [actionRow],
        ephemeral: true,
      });
      
      // Set up a component collector for attack interactions.
      const collector = interaction.channel.createMessageComponentCollector({
        filter: i => i.customId === 'worldboss_attack' && i.user.id === userId,
        time: Math.max(0, worldBossState.eventEnd - Date.now()),
      });
      
      collector.on('collect', async (btnInteraction) => {
        // In this example, we use the derived strength as the damage dealt.
        const derived = calculateDerivedStats(user);
        const playerDamage = Math.floor(derived.strength);
        
        // Update battle history.
        battleHistory.push(`You dealt ${playerDamage} damage.`);
        
        // Subtract player's damage from the boss.
        worldBossState.currentHP = Math.max(0, worldBossState.currentHP - playerDamage);
        
        // Boss counterattacks: reduce player's HP by the boss's damage.
        battleHistory.push(`${worldBossState.monster} counterattacked for ${worldBossState.m_score} damage.`);
        playerHP = Math.max(0, playerHP - worldBossState.m_score);
        
        let resultMsg = `You attacked and dealt **${playerDamage}** damage.\n` +
                        `${worldBossState.monster} hit back for **${worldBossState.m_score}** damage.`;
        
        // Check for battle end conditions.
        if (worldBossState.currentHP <= 0) {
          resultMsg += `\n\n**${worldBossState.monster} has been defeated!**`;
          battleHistory.push(`${worldBossState.monster} has fallen!`);
          collector.stop('bossDefeated');
        }
        if (playerHP <= 0) {
          resultMsg += `\n\n**You have been defeated!**`;
          battleHistory.push(`You have been defeated!`);
          collector.stop('playerDefeated');
        }
        
        // Rebuild the embed with updated HP and history.
        battleEmbed = generateWorldBossBattleEmbed(
          user,
          playerHP,
          worldBossState,
          battleHistory,
          interaction.user.displayAvatarURL()
        );
        
        await btnInteraction.update({
          content: resultMsg,
          embeds: [battleEmbed],
          components: [actionRow],
        });
      });
      
      collector.on('end', async (_, reason) => {
        // Update the user's HP (score) in the database after battle.
        await user.update({ score: playerHP });
        
        // Disable the Attack button after the battle ends.
        const disabledButton = ButtonBuilder.from(attackButton).setDisabled(true);
        const disabledRow = new ActionRowBuilder().addComponents(disabledButton);
        await interaction.editReply({ components: [disabledRow] });
      });
    },
  };
  