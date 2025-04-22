// migrations/YYYYMMDDHHMMSS-add-participants-to-raidboss.js
module.exports = {
  up: (qi, Sequelize) =>
    qi.addColumn('RaidBoss', 'participants', {
      type: Sequelize.JSON, // ARRAY(TEXT) if you prefer Postgres arrays
      allowNull: false,
      defaultValue: [],
    }),
  down: (qi) => qi.removeColumn('RaidBoss', 'participants'),
}
