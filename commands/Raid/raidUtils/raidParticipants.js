function getContributors(raidBoss) {
  const MIN_FRACTION = 0.02 // 2 %
  const hp = raidBoss.hp
  return Object.entries(raidBoss.participants) // [ [uid, dmg], … ]
    .filter(([, dmg]) => dmg / hp >= MIN_FRACTION)
    .map(([uid]) => uid)
}
module.exports = { getContributors }
