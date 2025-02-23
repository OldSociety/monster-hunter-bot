const cron = require('node-cron')
const { Op, col } = require('sequelize')
const { User } = require('../Models/model.js')

async function healUsers() {
  try {

    // Fetch all users who need healing (HP < Max HP)
    const usersNeedingHealing = await User.findAll({
      where: {
        current_raidHp: { [Op.lt]: col('score') }, // Only users who need healing
      },
    })
    // Heal users in batches
    await Promise.all(
      usersNeedingHealing.map(async (user) => {
        const maxHP = user.score
        const healAmount = Math.ceil(maxHP * 0.2) // Heal 20% of max HP

        user.current_raidHp = Math.min(user.current_raidHp + healAmount, maxHP)
        await user.save()

        console.log(
          `🔹 Healed ${user.user_id}: +${healAmount} HP (Now: ${user.current_raidHp}/${maxHP})`
        )
      })
    )

  } catch (error) {
    console.error('❌ Error in raid healing cron job:', error)
  }
}

function initializeRaidHealing(client) {
  // Runs every 6 minutes
  cron.schedule('*/6 * * * *', healUsers)
}

module.exports = { initializeRaidHealing }
