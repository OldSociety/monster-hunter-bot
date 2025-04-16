const cron = require('node-cron')
const { EmbedBuilder } = require('discord.js')

/**
 * Formats a time value in milliseconds to a string: "Xh Ym Zs".
 * @param {number} ms - Milliseconds remaining.
 * @returns {string} Formatted time string.
 */
function formatTimeRemaining(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}h ${minutes}m ${seconds}s`
}

/**
 * Starts a training countdown timer.
 * @param {string} trainingID - A unique ID for this training session.
 * @param {number} trainingDuration - Duration of training in milliseconds.
 * @param {function} updateCallback - Called every second with the formatted remaining time.
 * @param {function} completionCallback - Called when the training time is up.
 */
function startTrainingTimer(
  trainingID,
  trainingDuration,
  updateCallback,
  completionCallback
) {
  const startTime = Date.now()

  // Use setInterval to update every second.
  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const remaining = trainingDuration - elapsed

    if (remaining <= 0) {
      clearInterval(timer)
      updateCallback('Training complete!')
      completionCallback()
    } else {
      updateCallback(formatTimeRemaining(remaining))
    }
  }, 1000)

  // Return the timer instance if needed for cancellation.
  return timer
}

/**
 * Example helper to create a training status embed.
 * @param {string} title - Title of the embed.
 * @param {string} countdownText - Current countdown text.
 * @param {object} user - User object to display footer info.
 * @returns {EmbedBuilder} The training status embed.
 */
function createTrainingEmbed(title, countdownText, user) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`Time remaining: **${countdownText}**`)
    .setColor('Blue')
    .setFooter({
      text: `Available: 🪙${user.gold} | Base Score: ${user.base_score || 0}`,
    })
}

module.exports = {
  startTrainingTimer,
  formatTimeRemaining,
  createTrainingEmbed,
}
