module.exports = {
  name: 'guildCreate',
  execute(guild, client) {
    console.log(`Joined a new server: ${guild.name} (ID: ${guild.id})`)
  },
}
