'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const [users] = await queryInterface.sequelize.query(
      `SELECT user_id, currency FROM "Users";`
    )

    for (const user of users) {
      let currency
      try {
        currency = JSON.parse(user.currency) // Ensure parsing JSON
      } catch (error) {
        console.error(
          `Error parsing currency JSON for user ${user.user_id}:`,
          error
        )
        currency = {}
      }

      if (!currency.gear) {
        currency.gear = 0 // Add the new gear field with default value
      }

      await queryInterface.sequelize.query(
        `UPDATE "Users" SET currency = :currency WHERE user_id = :user_id;`,
        {
          replacements: {
            currency: JSON.stringify(currency), // Convert back to JSON string
            user_id: user.user_id,
          },
        }
      )
    }
  },

  async down(queryInterface, Sequelize) {
    const [users] = await queryInterface.sequelize.query(
      `SELECT user_id, currency FROM "Users";`
    )

    for (const user of users) {
      let currency
      try {
        currency = JSON.parse(user.currency)
      } catch (error) {
        console.error(
          `Error parsing currency JSON for user ${user.user_id}:`,
          error
        )
        continue
      }

      if (currency.gear !== undefined) {
        delete currency.gear // Remove the gear field on rollback
      }

      await queryInterface.sequelize.query(
        `UPDATE "Users" SET currency = :currency WHERE user_id = :user_id;`,
        {
          replacements: {
            currency: JSON.stringify(currency),
            user_id: user.user_id,
          },
        }
      )
    }
  },
}
