const { REST, Routes } = require('discord.js')
const fs = require('fs')
const path = require('path')

// Set default NODE_ENV if undefined
const env = process.env.NODE_ENV || 'development'
console.log(`Environment: ${env}`)

// Load environment variables
require('dotenv').config({
  path: env === 'development' ? '.env.development' : '.env.production',
})

console.log(`🔍 Loaded ENV Variables:`)
console.log(`- CLIENTID: ${process.env.CLIENTID}`)
console.log(
  `- GUILDID: ${process.env.GUILDID || 'Not required for production'}`
)

const commands = []

const foldersPath = path.join(__dirname, 'commands')
const commandFolders = fs.readdirSync(foldersPath)

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder)
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'))

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const command = require(filePath)
    console.log(`Reading folder: ${folder}`)
    console.log(`Reading file: ${file}`)
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON())
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      )
    }
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN)

;(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    )

    let data

    if (env === 'development') {
      // Fast updates for development in a specific test server
      console.log(
        `Deploying GUILD commands to test server: ${process.env.GUILD_ID}`
      )
      data = await rest.put(
        Routes.applicationGuildCommands(
          process.env.CLIENTID,
          process.env.GUILDID
        ),
        { body: commands }
      )
    } else {
      // Global deployment for production (takes up to 1 hour)
      console.log('Deploying GLOBAL commands (may take up to 1 hour to update)')
      data = await rest.put(Routes.applicationCommands(process.env.CLIENTID), {
        body: commands,
      })
    }

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    )
    console.log(`Client ID: ${process.env.CLIENTID}`)
  } catch (error) {
    console.error(error)
  }
})()
