const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const { pullSpecificMonster, pullMonsterByCR } = require('../../handlers/huntCacheHandler')
const { checkAdvantage } = require('./huntHelpers.js')
const { runBattlePhases } = require('./battleHandler.js')
const { addGoldToUser, displayHuntSummary } = require('./rewardHandler.js')

function selectMonster(huntData, currentBattle) {
    if (huntData.lastMonster && huntData.retries > 0) return huntData.lastMonster
    return (currentBattle.type === 'mini-boss' || currentBattle.type === 'boss') 
        ? pullSpecificMonster(currentBattle.monsterIndex) 
        : pullMonsterByCR(currentBattle.cr)
}

function calculateMonsterHP(monster, difficulty) {
    const difficultyModifiers = {
        'easy': 0.5, 'medium': 0.75, 'hard': 1.25, 'very-hard': 1.5,
        'boss-half': 0.5, 'boss-full': 1, 'boss-strong': 1.25
    }
    return Math.max(monster.hp * (difficultyModifiers[difficulty] || 1), 8)
}

function createMonsterEmbed(monster, difficulty, ichorUsed) {
    let title = monster.name
    if (difficulty === 'boss') title += ' ``Boss!``'
    if (difficulty === 'mini-boss') title += ' ``Mini-boss``'

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`**CR:** ${monster.cr}\n**Type:** ${monster.type}`)
        .setColor('#FFA500')
        .setThumbnail(`https://raw.githubusercontent.com/OldSociety/monster-hunter-bot/main/assets/${monster.index}.jpg`)

    if (ichorUsed) {
        embed.addFields({ name: 'Ichor Invigoration', value: 'You are invigorated with 🧪ichor! Your strength increases.' })
    }
    return embed
}

function createStyleButtons(user) {
    const styles = ['brute', 'spellsword', 'stealth']
    const styleColors = { brute: ButtonStyle.Danger, spellsword: ButtonStyle.Primary, stealth: ButtonStyle.Success }
    
    const styleRow = new ActionRowBuilder()
    styles.forEach(style => {
        if (user[`${style}_score`] > 0) {
            styleRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`style_${style}`)
                    .setLabel(`${style.charAt(0).toUpperCase() + style.slice(1)}: ${user[`${style}_score`]}`)
                    .setStyle(styleColors[style])
            )
        }
    })
    return styleRow
}

async function startNewEncounter(interaction, user, huntData) {
    const currentBattle = huntData.level.battles[huntData.currentBattleIndex]
    const monster = selectMonster(huntData, currentBattle)

    if (!monster) {
        return interaction.followUp({ content: 'No monsters available.', ephemeral: true })
    }

    huntData.lastMonster = monster
    const monsterScore = calculateMonsterHP(monster, currentBattle.difficulty)
    const monsterEmbed = createMonsterEmbed(monster, currentBattle.type, huntData.ichorUsed)
    const styleRow = createStyleButtons(user)

    await interaction.followUp({ embeds: [monsterEmbed], components: [styleRow], ephemeral: true })

    if (huntData.styleCollector) huntData.styleCollector.stop()

    const filter = (i) => i.user.id === interaction.user.id
    const styleCollector = interaction.channel.createMessageComponentCollector({ filter, max: 1, time: 15000 })

    huntData.styleCollector = styleCollector

    styleCollector.on('collect', async (styleInteraction) => {
        await styleInteraction.deferUpdate()
        const selectedStyle = styleInteraction.customId.split('_')[1]
        const playerScore = user[`${selectedStyle}_score`]
        const advMultiplier = checkAdvantage(selectedStyle, monster.type)

        const playerWins = await runBattlePhases(
            interaction, user, playerScore, monsterScore, monster, advMultiplier, huntData, currentBattle.type
        )

        if (playerWins) {
            huntData.totalMonstersDefeated += 1
            huntData.totalGoldEarned += currentBattle.goldReward || 0
            huntData.currentBattleIndex += 1
            huntData.retries = 0
            huntData.lastMonster = null

            if (huntData.currentBattleIndex >= huntData.level.battles.length) {
                await displayHuntSummary(interaction, user, huntData, true)
            } else {
                await startNewEncounter(interaction, user, huntData)
            }
        } else {
            huntData.retries += 1
            if (huntData.retries < 3) {
                await offerRetry(interaction, user, huntData)
            } else {
                await displayHuntSummary(interaction, user, huntData, false)
            }
        }
    })

    styleCollector.on('end', async (_, reason) => {
        if (reason === 'time') {
            await interaction.followUp({ content: 'Time expired. Please try again.', ephemeral: true })
        }
    })
}

module.exports = {
    startNewEncounter
}
