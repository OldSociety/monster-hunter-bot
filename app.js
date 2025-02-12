require('dotenv').config({
  path:
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : '.env.production',
})

console.log(`Environment: ${process.env.NODE_ENV}`)

const fs = require('node:fs')
const path = require('node:path')
const sequelize = require('./config/sequelize.js')
const cron = require('node-cron')

const { Client, Collection, GatewayIntentBits } = require('discord.js')
const { User } = require('./Models/model')
const { initializeRaidTimer } = require('./handlers/raidTimerHandler') // ✅ Import properly

// Import event handler
const eventHandler = require('./handlers/eventHandler')

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
})

// Attach the client globally (if needed elsewhere)
global.client = client

// Dynamically read and create commands
client.cooldowns = new Collection()
client.commands = new Collection()
const foldersPath = path.join(__dirname, 'commands')
const commandEntries = fs.readdirSync(foldersPath, { withFileTypes: true })

for (const entry of commandEntries) {
  if (entry.isDirectory()) {
    const commandsPath = path.join(foldersPath, entry.name)
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith('.js'))

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file)
      const command = require(filePath)
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command)
      } else {
        console.log(
          `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
        )
      }
    }
  }
}

// Load events dynamically
eventHandler(client)

// Import message handler
const messageHandler = require('./handlers/messageHandler')
messageHandler(client, User)

client.once('ready', async () => {
  console.log(`✅ Bot is online as ${client.user.tag}`)

  // ✅ Start Raid Timer only after bot is ready
  initializeRaidTimer(client)
})

// Login
client.login(process.env.TOKEN)

module.exports = { sequelize }
