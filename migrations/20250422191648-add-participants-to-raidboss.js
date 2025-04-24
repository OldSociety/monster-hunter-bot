// migrations\20250422191648-add-participants-to-raidboss.js
'use strict';
module.exports = {
  up: (qi, S) =>
    qi.addColumn('RaidBoss', 'participants', {
      type: S.JSONB,
      allowNull: false,
      defaultValue: {},
    }),
  down: (qi) => qi.removeColumn('RaidBoss', 'participants'),
};
