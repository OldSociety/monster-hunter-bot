// app.js

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

global.client = client

//Dynamically read and create commands
client.cooldowns = new Collection()
client.commands = new Collection()
const foldersPath = path.join(__dirname, 'commands')
const commandEntries = fs.readdirSync(foldersPath, { withFileTypes: true })

for (const entry of commandEntries) {
  if (entry.isDirectory()) {
    // If the entry is a folder, go through it and load its commands
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
  } else if (entry.isFile() && entry.name.endsWith('.js')) {
    // If the entry is a file and ends with `.js`, it's a command file
    const filePath = path.join(foldersPath, entry.name)
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

// Dynamically read event files
const eventsPath = path.join(__dirname, 'events')
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith('.js'))

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file)
  const event = require(filePath)
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args))
  } else {
    client.on(event.name, (...args) => event.execute(...args))
  }
}
// Import the message handler and booster handler
const messageHandler = require('./handlers/messageHandler')

// Call the function to set up message handling
messageHandler(client, User)

// Schedule a cron job to refill energy every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    const users = await User.findAll()

    for (const user of users) {
      let currency = user.currency || {
        energy: 15,
        gems: 0,
        eggs: 0,
        ichor: 0,
        dice: 0,
      }

      if (typeof currency !== 'object') {
        currency = { energy: 15, gems: 0, eggs: 0, ichor: 0, dice: 0 }
      }

      const currentEnergy = currency.energy || 0

      if (currentEnergy < 15) {
        currency.energy = Math.min(currentEnergy + 2, 15)
        user.currency = currency
        user.changed('currency', true)
        await user.save()
        console.log(
          `User ID: ${user.user_id}, Updated Currency:`,
          user.currency
        )
      } else {
        console.log(`User ID: ${user.user_id} already has maximum energy.`)
      }
    }

    console.log('Energy refilled for all users.')
  } catch (error) {
    console.error('Error refilling energy:', error)
  }
})

// Log in to Discord with client's token
client.login(process.env.TOKEN)

module.exports = { sequelize }
